import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';
import { AnalyticsService, StaffActivityMetrics, AuditLog, TimeframeType } from 'src/app/services/analytics.service';
import { Chart, registerables } from 'chart.js/auto';

Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
})
export class AnalyticsPage implements OnInit {
  @ViewChild('activityCanvas') activityCanvas: ElementRef | undefined;
  @ViewChild('staffComparisonCanvas') staffComparisonCanvas: ElementRef | undefined;
  @ViewChild('auditTrailCanvas') auditTrailCanvas: ElementRef | undefined;

  facilityId: string = '';
  facilityName: string = '';
  selectedTimeframe: TimeframeType = 'weekly';
  summaryData: any = null;
  staffMetrics: StaffActivityMetrics[] = [];
  selectedStaff: StaffActivityMetrics | null = null;
  staffAuditLogs: AuditLog[] = [];
  
  // Charts
  activityChart: any;
  staffComparisonChart: any;
  auditTrailChart: any;
  entityTypeFilter: string | null = null;
  
  isLoading: boolean = false;
  loadingElement: HTMLIonLoadingElement | null = null;
  error: string | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private analyticsService: AnalyticsService,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}
  handleFilterChange(event: any) {
    this.entityTypeFilter = event.detail.value;
    if (this.selectedStaff) {
      this.viewStaffDetails(this.selectedStaff);
    }
  }
  async ngOnInit() {
    await this.presentLoading('Loading analytics...');
    
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (user && (user.type === 'facility' || user.type === 'staff')) {
          this.facilityId = user.type === 'facility' 
            ? user.data.facilityId 
            : user.data.facilityId;
          
          this.facilityName = user.type === 'facility'
            ? user.data.name
            : ''; // You might want to fetch the facility name if user is staff
          
          this.loadAnalytics();
        } else {
          this.dismissLoading();
          this.showError('Unauthorized', 'You do not have permission to view analytics.');
        }
      },
      error: (err) => {
        this.dismissLoading();
        this.showError('Authentication Error', 'Failed to authenticate user.');
      }
    });
  }
  async loadAnalytics() {
    this.isLoading = true;
    this.error = null; // Reset error state
    
    try {
      // Load summary data
      this.analyticsService.getFacilityAnalyticsSummary(this.facilityId, this.selectedTimeframe)
        .pipe(
          tap(data => {
            console.log('Facility summary data:', data);
            this.summaryData = data;
          }),
          catchError(err => {
            console.error('Failed to load facility summary:', err);
            this.showError('Data Error', 'Failed to load facility summary data.');
            return of(null);
          })
        )
        .subscribe(() => {
          if (this.summaryData) {
            this.renderActivityChart();
          }
        });
      
      // Load staff metrics
      this.analyticsService.getStaffActivityMetrics(this.facilityId, this.selectedTimeframe)
        .pipe(
          tap(metrics => {
            console.log('Staff metrics loaded:', metrics.length);
            this.staffMetrics = metrics;
          }),
          catchError(err => {
            console.error('Failed to load staff metrics:', err);
            this.showError('Data Error', 'Failed to load staff metrics.');
            return of([]);
          })
        )
        .subscribe({
          next: (metrics) => {
            console.log('Staff metrics subscription complete with', metrics.length, 'items');
            if (this.staffMetrics.length > 0) {
              this.renderStaffComparisonChart();
            }
            this.dismissLoading();
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error in staff metrics subscription:', err);
            this.dismissLoading();
            this.isLoading = false;
            this.error = 'Error loading staff data. Please try again.';
          },
          complete: () => {
            this.dismissLoading();
            this.isLoading = false;
          }
        });
    } catch (err) {
      console.error('Top level analytics loading error:', err);
      this.error = 'Failed to load analytics data. Please try again later.';
      this.dismissLoading();
      this.isLoading = false;
    }
  }


  async changeTimeframe(timeframe: TimeframeType) {
    this.selectedTimeframe = timeframe;
    await this.presentLoading('Updating analytics...');
    this.loadAnalytics();
    
    // If a staff member is selected, refresh their data too
    if (this.selectedStaff) {
      this.viewStaffDetails(this.selectedStaff);
    }
  }

  async viewStaffDetails(staff: StaffActivityMetrics) {
    this.selectedStaff = staff;
    await this.presentLoading('Loading staff details...');
    
    console.log(`Viewing details for staff ${staff.staffId}`);
    
    this.analyticsService.getStaffAuditLogs(
      staff.staffId, 
      this.selectedTimeframe, 
      this.entityTypeFilter as any
    )
      .pipe(
        tap(logs => {
          console.log(`Received ${logs.length} audit logs for staff ${staff.staffId}`);
          this.staffAuditLogs = logs;
        }),
        catchError(err => {
          console.error(`Failed to load staff audit logs for ${staff.staffId}:`, err);
          this.showError('Data Error', 'Failed to load staff audit logs. Please try again.');
          return of([]);
        })
      )
      .subscribe({
        next: () => {
          this.renderAuditTrailChart();
          this.dismissLoading();
        },
        error: (err) => {
          console.error('Error in staff audit logs subscription:', err);
          this.dismissLoading();
          this.showError('Error', 'An error occurred while loading staff details.');
        },
        complete: () => {
          this.dismissLoading();
        }
      });
  }

  filterAuditLogs(entityType: string | null) {
    this.entityTypeFilter = entityType;
    if (this.selectedStaff) {
      this.viewStaffDetails(this.selectedStaff);
    }
  }

  renderActivityChart() {
    if (!this.summaryData || !this.activityCanvas) {
      console.warn('Cannot render activity chart: missing data or canvas element');
      return;
    }
    
    const ctx = this.activityCanvas.nativeElement.getContext('2d');
    
    if (this.activityChart) {
      this.activityChart.destroy();
    }
    
    this.activityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Patients', 'Prescriptions', 'Lab Results', 'Radiology', 'EHR Updates'],
        datasets: [{
          label: 'Facility Activity',
          data: [
            this.summaryData.totalPatients,
            this.summaryData.totalPrescriptions,
            this.summaryData.totalLabResults,
            this.summaryData.totalRadiologyResults,
            this.summaryData.totalEhrUpdates
          ],
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  renderStaffComparisonChart() {
    if (this.staffMetrics.length === 0 || !this.staffComparisonCanvas) return;
    
    const ctx = this.staffComparisonCanvas.nativeElement.getContext('2d');
    
    if (this.staffComparisonChart) {
      this.staffComparisonChart.destroy();
    }
    
    // Limit to top 10 staff members by total activity
    const topStaff = [...this.staffMetrics]
      .sort((a, b) => {
        const totalA = a.totalPrescriptionsIssued + a.totalLabOrdersProcessed + 
                      a.totalRadiologyOrdersProcessed + a.totalEhrUpdates;
        const totalB = b.totalPrescriptionsIssued + b.totalLabOrdersProcessed + 
                      b.totalRadiologyOrdersProcessed + b.totalEhrUpdates;
        return totalB - totalA;
      })
      .slice(0, 10);
    
    this.staffComparisonChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: topStaff.map(staff => staff.name),
        datasets: [
          {
            label: 'Prescriptions',
            data: topStaff.map(staff => staff.totalPrescriptionsIssued),
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          },
          {
            label: 'Lab Orders',
            data: topStaff.map(staff => staff.totalLabOrdersProcessed),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Radiology Orders',
            data: topStaff.map(staff => staff.totalRadiologyOrdersProcessed),
            backgroundColor: 'rgba(255, 206, 86, 0.6)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1
          },
          {
            label: 'EHR Updates',
            data: topStaff.map(staff => staff.totalEhrUpdates),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            stacked: false
          },
          y: {
            stacked: false,
            beginAtZero: true
          }
        }
      }
    });
  }

  renderAuditTrailChart() {
    if (!this.auditTrailCanvas) {
      console.warn('Cannot render audit trail chart: canvas element not found');
      return;
    }
    
    if (!this.staffAuditLogs || this.staffAuditLogs.length === 0) {
      console.log('No audit logs to display in chart');
      // Optionally display a message in the chart area
      if (this.auditTrailChart) {
        this.auditTrailChart.destroy();
        this.auditTrailChart = null;
      }
      return;
    }
    
    const ctx = this.auditTrailCanvas.nativeElement.getContext('2d');
    
    if (this.auditTrailChart) {
      this.auditTrailChart.destroy();
    }
    
    try {
      // Count actions by entity type
      const entityTypeCounts = this.staffAuditLogs.reduce((acc, log) => {
        const entityType = log.entityType || 'unknown';
        acc[entityType] = (acc[entityType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Check if we have any data
      if (Object.keys(entityTypeCounts).length === 0) {
        console.log('No entity types found in audit logs');
        return;
      }
      
      // Generate colors for each entity type
      const backgroundColors = [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(255, 159, 64, 0.6)',
        'rgba(201, 203, 207, 0.6)'
      ];
      
      const borderColors = backgroundColors.map(color => 
        color.replace('0.6', '1')
      );
      
      // Get entity type labels
      const labels = Object.keys(entityTypeCounts).map(type => 
        this.getEntityTypeLabel(type)
      );
      
      this.auditTrailChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: Object.values(entityTypeCounts),
            backgroundColor: backgroundColors.slice(0, labels.length),
            borderColor: borderColors.slice(0, labels.length),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'right',
            },
            title: {
              display: true,
              text: 'Activities by Entity Type'
            }
          }
        }
      });
    } catch (err) {
      console.error('Error rendering audit trail chart:', err);
      // Don't show an error to the user, just skip the chart
    }
  }

  getFormattedDate(date: Date | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  closeStaffDetails() {
    this.selectedStaff = null;
    this.staffAuditLogs = [];
    if (this.auditTrailChart) {
      this.auditTrailChart.destroy();
      this.auditTrailChart = null;
    }
  }

  async presentLoading(message: string) {
    this.loadingElement = await this.loadingController.create({
      message: message,
      spinner: 'circular'
    });
    return this.loadingElement.present();
  }

  async dismissLoading() {
    if (this.loadingElement) {
      await this.loadingElement.dismiss();
      this.loadingElement = null;
    }
  }

  async showError(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Helper method to format timestamp for display
  formatTimestamp(timestamp: any): string {
    // Handle different timestamp formats (Date, Firestore Timestamp, etc.)
    if (!timestamp) return 'N/A';
    
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }
    
    // If it's a Firestore Timestamp (with toDate method)
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString();
    }
    
    // If it's a timestamp number or string
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return 'Invalid Date';
    }
  }

  // Helper to get entity type label
  getEntityTypeLabel(type: string): string {
    const labels: {[key: string]: string} = {
      'patient': 'Patient',
      'ehr': 'Electronic Health Record',
      'prescription': 'Prescription',
      'labResult': 'Laboratory Result',
      'radiologyResult': 'Radiology Result',
      'inventory': 'Inventory Item',
      'room': 'Room Allocation'
    };
    return labels[type] || type;
  }
}