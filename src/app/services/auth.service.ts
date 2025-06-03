import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of, from, throwError } from 'rxjs';
import { switchMap, map, catchError, tap } from 'rxjs/operators';
import firebase from 'firebase/compat/app';

import { Facility } from 'src/app/shared//models/facility.model';
import { Staff } from 'src/app/shared//models/staff.model';
import { Patient } from 'src/app/shared/models/patient.model';

export interface AuthUser {
  uid: string;
  email: string;
  type: 'facility' | 'staff' | 'patient';
  data: Facility | Staff | Patient;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser$: Observable<AuthUser | null>;
  
  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore
  ) {
    // Initialize the current user observable
    this.currentUser$ = this.afAuth.authState.pipe(
      switchMap(user => {
        if (!user) {
          return of(null);
        }
        
        // First check if the user is a facility
        return this.firestore.collection<Facility>('facilities')
          .get().pipe(
            switchMap(facilitiesSnapshot => {
              const facilityDoc = facilitiesSnapshot.docs.find(doc => 
                doc.data().contactEmail === user.email);
              
              if (facilityDoc) {
                const facilityData = facilityDoc.data();
                const facility: Facility = { 
                  ...facilityData,
                  facilityId: facilityDoc.id,
                
                };
                return of({
                  uid: user.uid,
                  email: user.email!,
                  type: 'facility' as const,
                  data: facility
                });
              }
              
              // Check if the user is a staff member
              return this.firestore.collection<Staff>('staff')
                .get().pipe(
                  switchMap(staffSnapshot => {
                    const staffDoc = staffSnapshot.docs.find(doc => 
                      doc.data().email === user.email);
                    
                    if (staffDoc) {
                      const staffData = staffDoc.data();
                      const staff: Staff = {
                        ...staffData,
                        staffId: staffDoc.id
                      };
                      return of({
                        uid: user.uid,
                        email: user.email!,
                        type: 'staff' as const,
                        data: staff
                      });
                    }
                    
                    // Check if the user is a patient
                    return this.firestore.collection<Patient>('patients')
                      .get().pipe(
                        map(patientsSnapshot => {
                          const patientDoc = patientsSnapshot.docs.find(doc => 
                            doc.data().email === user.email);
                          
                          if (patientDoc) {
                            const patientData = patientDoc.data();
                            const patient: Patient = {
                              ...patientData,
                              patientId: patientDoc.id
                            };
                            return {
                              uid: user.uid,
                              email: user.email!,
                              type: 'patient' as const,
                              data: patient
                            };
                          }
                          
                          return null;
                        })
                      );
                  })
                );
            })
          );
      }),
      catchError(error => {
        console.error('Error fetching authenticated user:', error);
        return of(null);
      })
    );
  }

  // Login with email and password
  login(email: string, password: string): Observable<AuthUser> {
    return from(this.afAuth.signInWithEmailAndPassword(email, password)).pipe(
      switchMap(credential => {
        if (!credential.user) {
          return throwError(() => new Error('Login failed'));
        }
        
        // Wait for currentUser$ to emit the authenticated user
        return this.currentUser$.pipe(
          switchMap(user => {
            if (!user) {
              return throwError(() => new Error('Failed to fetch user data'));
            }
            return of(user);
          })
        );
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  // Login with ID (for custom ID authentication)
  loginWithId(id: string, password: string): Observable<AuthUser> {
    // First, find the email associated with the ID
    return this.findEmailById(id).pipe(
      switchMap(email => {
        if (!email) {
          return throwError(() => new Error('User ID not found'));
        }
        
        // Proceed with regular email/password login
        return this.login(email, password);
      })
    );
  }

  // Helper method to find email by ID (facilityId, staffId, or patientId)
  private findEmailById(id: string): Observable<string | null> {
    // Check facilities collection
    return this.firestore.doc<Facility>(`facilities/${id}`).get().pipe(
      switchMap(facilityDoc => {
        if (facilityDoc.exists) {
          return of(facilityDoc.data()?.contactEmail || null);
        }
        
        // Check staff collection
        return this.firestore.doc<Staff>(`staff/${id}`).get().pipe(
          switchMap(staffDoc => {
            if (staffDoc.exists) {
              return of(staffDoc.data()?.email || null);
            }
            
            // Check patients collection
            return this.firestore.doc<Patient>(`patients/${id}`).get().pipe(
              map(patientDoc => {
                if (patientDoc.exists) {
                  return patientDoc.data()?.email || null;
                }
                return null;
              })
            );
          })
        );
      })
    );
  }

  // Get current authenticated user
  getCurrentUser(): Observable<AuthUser | null> {
    return this.currentUser$;
  }

  // Reset password
  resetPassword(email: string): Observable<void> {
    return from(this.afAuth.sendPasswordResetEmail(email)).pipe(
      catchError(error => {
        console.error('Password reset error:', error);
        return throwError(() => error);
      })
    );
  }

  // Logout
  logout(): Observable<void> {
    return from(this.afAuth.signOut());
  }

  // Register a new user (if needed)
  registerUser(email: string, password: string): Observable<firebase.auth.UserCredential> {
    return from(this.afAuth.createUserWithEmailAndPassword(email, password));
  }

  // Update password for authenticated user
  updatePassword(newPassword: string): Observable<void> {
    return from(this.afAuth.currentUser).pipe(
      switchMap(user => {
        if (!user) {
          return throwError(() => new Error('No authenticated user found'));
        }
        return from(user.updatePassword(newPassword));
      }),
      catchError(error => {
        console.error('Update password error:', error);
        return throwError(() => error);
      })
    );
  }
}