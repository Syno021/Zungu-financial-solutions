import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { AngularFirestore, CollectionReference, Query } from '@angular/fire/compat/firestore';
import { AuthService, AuthUser } from 'src/app/services/auth.service';
import { LoadingController } from '@ionic/angular';

// Define interfaces for your data structures
interface StaffRole {
  role: string;
  [key: string]: any;
}

interface Staff {
  staffId: string;
  role: string;
  specialization: string;
  email: string;
  phone: string;
  profilePictureUrl: string;
  registrationNumber: string;
  [key: string]: any;
}

interface Facility {
  facilityId: string;
  [key: string]: any;
}

interface Patient {
  dateOfBirth: any; // Ideally this would be a more specific type
  [key: string]: any;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  currentUser$: Observable<AuthUser | null>;
  dashboardMetrics: any = {};
  isLoading = true;
  facilityChartOptions: any;
  patientDistributionOptions: any;
  today: Date = new Date(); // Add this property

  constructor(
    private authService: AuthService,
    private firestore: AngularFirestore,
    private router: Router,
    private loadingController: LoadingController
  ) {
    this.currentUser$ = this.authService.getCurrentUser();
  }

  // Helper methods to safely access user data properties
  getUserRole(user: AuthUser | null): string {
    if (!user || user.type !== 'staff') return 'N/A';
    return (user.data as Staff).role || 'N/A';
  }

  getUserSpecialization(user: AuthUser | null): string {
    if (!user || user.type !== 'staff') return 'N/A';
    return (user.data as Staff).specialization || 'N/A';
  }

  getUserProfilePicture(user: AuthUser | null): string {
    if (!user || user.type !== 'staff') return 'assets/default-avatar.png';
    return (user.data as Staff).profilePictureUrl || 'assets/default-avatar.png';
  }

  getUserStaffId(user: AuthUser | null): string {
    if (!user || user.type !== 'staff') return 'N/A';
    return (user.data as Staff).staffId || 'N/A';
  }

  getUserEmail(user: AuthUser | null): string {
    if (!user || user.type !== 'staff') return 'N/A';
    return (user.data as Staff).email || 'N/A';
  }

  getUserPhone(user: AuthUser | null): string {
    if (!user || user.type !== 'staff') return 'N/A';
    return (user.data as Staff).phone || 'N/A';
  }

  getUserRegistrationNumber(user: AuthUser | null): string {
    if (!user || user.type !== 'staff') return 'N/A';
    return (user.data as Staff).registrationNumber || 'N/A';
  }

  async ngOnInit() {
    const loading = await this.loadingController.create({
      message: 'Loading dashboard...',
      spinner: 'circular'
    });
    await loading.present();

    this.currentUser$.pipe(
      tap(() => this.isLoading = true),
      switchMap(user => {
        if (!user) {
          return new Observable(observer => {
            observer.next(null);
            observer.complete();
          });
        }

        if (user.type === 'facility') {
          const facilityId = (user.data as Facility).facilityId;
          return this.loadFacilityMetrics(facilityId);
        } else if (user.type === 'staff') {
          const staffData = user.data as Staff;
          // Fix: Use bracket notation to access the facilityId property
          return this.loadStaffMetrics(staffData.staffId, staffData['facilityId']);
        }

        return new Observable(observer => {
          observer.next(null);
          observer.complete();
        });
      })
    ).subscribe({
      next: () => {
        this.isLoading = false;
        loading.dismiss();
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
        loading.dismiss();
      }
    });
  }

  loadFacilityMetrics(facilityId: string): Observable<any> {
    // Initialize dashboard metrics with zero counts
    this.dashboardMetrics = {
      patients: 0,
      staff: 0,
      rooms: 0,
      radiologyResults: 0,
      prescriptions: 0,
      labResults: 0,
      inventory: 0,
      ehrs: 0
    };

    // Define all the collection queries we need to make
    const collections = [
      { name: 'patients', query: (ref: CollectionReference) => ref.where('facilityId', '==', facilityId) },
      { name: 'staff', query: (ref: CollectionReference) => ref.where('facilityId', '==', facilityId) },
      { name: 'rooms', query: (ref: CollectionReference) => ref.where('facilityId', '==', facilityId) },
      { name: 'radiologyResults', query: (ref: CollectionReference) => ref.where('facilityId', '==', facilityId) },
      { name: 'prescriptions', query: (ref: CollectionReference) => ref.where('facilityId', '==', facilityId) },
      { name: 'labResults', query: (ref: CollectionReference) => ref.where('facilityId', '==', facilityId) },
      { name: 'inventory', query: (ref: CollectionReference) => ref.where('facilityId', '==', facilityId) },
      { name: 'ehrs', query: (ref: CollectionReference) => ref.where('facilityId', '==', facilityId) }
    ];

    // Create an array of observables for each collection count
    const countObservables = collections.map(collection => {
      return this.firestore.collection(collection.name, collection.query)
        .get()
        .pipe(
          map(snapshot => {
            this.dashboardMetrics[collection.name] = snapshot.size;
            return snapshot.size;
          })
        );
    });

    // Also get staff breakdown by role for visualization
    const staffByRoleObservable = this.firestore.collection('staff', 
      (ref: CollectionReference) => ref.where('facilityId', '==', facilityId))
      .get()
      .pipe(
        map(snapshot => {
          const roleCount: {[key: string]: number} = {};
          snapshot.docs.forEach(doc => {
            // Fix the unknown type issue by explicitly casting the data
            const data = doc.data() as StaffRole;
            const role = data.role;
            roleCount[role] = (roleCount[role] || 0) + 1;
          });
          
          // Setup chart data
          this.setupStaffChart(roleCount);
          return roleCount;
        })
      );
      
    // Get patient data for visualization
    const patientDataObservable = this.firestore.collection('patients',
      (ref: CollectionReference) => ref.where('facilityId', '==', facilityId))
      .get()
      .pipe(
        map(snapshot => {
          // Setup patient distribution chart
          this.setupPatientDistributionChart(snapshot.docs.map(doc => doc.data() as Patient));
          return snapshot.size;
        })
      );

    // Combine all observables
    return new Observable(observer => {
      // Execute all count queries in parallel
      Promise.all([
        ...countObservables.map(obs => 
          obs.toPromise().catch(err => {
            console.error('Error fetching collection count:', err);
            return 0;
          })
        ),
        staffByRoleObservable.toPromise().catch(err => {
          console.error('Error fetching staff roles:', err);
          return {};
        }),
        patientDataObservable.toPromise().catch(err => {
          console.error('Error fetching patient data:', err);
          return 0;
        })
      ]).then(() => {
        observer.next(this.dashboardMetrics);
        observer.complete();
      }).catch(error => {
        console.error('Error in dashboard metrics:', error);
        observer.error(error);
      });
    });
  }

  setupStaffChart(roleCount: {[key: string]: number}) {
    const labels = Object.keys(roleCount);
    const data = Object.values(roleCount);
    
    // Prepare chart data
    this.facilityChartOptions = {
      series: [{
        name: 'Staff Count',
        data: data
      }],
      chart: {
        type: 'bar',
        height: 250
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
        },
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: labels,
      },
      fill: {
        opacity: 1
      },
      tooltip: {
        y: {
          formatter: function (val: any) {
            return val + " staff members";
          }
        }
      }
    };
  }

  setupPatientDistributionChart(patients: Patient[]) {
    // Example: Group patients by age range
    const ageGroups = {
      'Under 18': 0,
      '18-30': 0,
      '31-45': 0,
      '46-60': 0,
      'Over 60': 0
    };
    
    patients.forEach(patient => {
      if (!patient.dateOfBirth) return;
      
      const birthDate = new Date(patient.dateOfBirth.toDate ? patient.dateOfBirth.toDate() : patient.dateOfBirth);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      
      if (age < 18) ageGroups['Under 18']++;
      else if (age <= 30) ageGroups['18-30']++;
      else if (age <= 45) ageGroups['31-45']++;
      else if (age <= 60) ageGroups['46-60']++;
      else ageGroups['Over 60']++;
    });
    
    this.patientDistributionOptions = {
      series: Object.values(ageGroups),
      chart: {
        type: 'pie',
        height: 250
      },
      labels: Object.keys(ageGroups),
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            width: 200
          },
          legend: {
            position: 'bottom'
          }
        }
      }]
    };
  }

  loadStaffMetrics(staffId: string, facilityId: string): Observable<any> {
    // For staff dashboard, we load assigned patients and related metrics
    return this.firestore.collection('patients', 
      (ref: CollectionReference) => ref.where('assignedStaffIds', 'array-contains', staffId))
      .get()
      .pipe(
        map(snapshot => {
          this.dashboardMetrics = {
            assignedPatients: snapshot.size,
            pendingTasks: 0,
            upcomingAppointments: 0
          };
          
          // Get pending tasks
          this.firestore.collection('tasks', 
            (ref: CollectionReference) => ref.where('assignedTo', '==', staffId)
                     .where('status', '==', 'pending'))
            .get()
            .subscribe(tasksSnapshot => {
              this.dashboardMetrics.pendingTasks = tasksSnapshot.size;
            });
            
          // Get upcoming appointments
          const today = new Date();
          const nextWeek = new Date();
          nextWeek.setDate(today.getDate() + 7);
          
          this.firestore.collection('appointments', 
            (ref: CollectionReference) => ref.where('staffId', '==', staffId)
                     .where('date', '>=', today)
                     .where('date', '<=', nextWeek))
            .get()
            .subscribe(appointmentsSnapshot => {
              this.dashboardMetrics.upcomingAppointments = appointmentsSnapshot.size;
            });
          
          return this.dashboardMetrics;
        })
      );
  }

  navigateTo(page: string) {
    this.router.navigate([`/${page}`]);
  }
}