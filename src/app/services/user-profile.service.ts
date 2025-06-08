// src/app/services/user-profile.service.ts
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, combineLatest, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { User } from '../shared/models/user.model';
import { KYC } from '../shared/models/kyc.model';

export interface UserProfileData {
  user: User | null;
  kyc: KYC | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {

  constructor(
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth
  ) { }

  getCurrentUserProfile(): Observable<UserProfileData> {
    return this.afAuth.authState.pipe(
      switchMap(auth => {
        if (!auth) {
          return of({ user: null, kyc: null });
        }

        const user$ = this.firestore
          .collection<User>('users')
          .doc(auth.uid)
          .valueChanges({ idField: 'uid' });

        const kyc$ = this.firestore
          .collection<KYC>('kyc', ref => ref.where('userId', '==', auth.uid))
          .valueChanges({ idField: 'id' })
          .pipe(
            map(kycArray => kycArray.length > 0 ? kycArray[0] : null)
          );

        return combineLatest([user$, kyc$]).pipe(
          map(([user, kyc]) => ({ user: user ?? null, kyc }))
        );
      })
    );
  }

  updateUserProfile(userData: Partial<User>): Promise<void> {
    return this.afAuth.currentUser.then(user => {
      if (user) {
        return this.firestore
          .collection('users')
          .doc(user.uid)
          .update({
            ...userData,
            updatedAt: new Date()
          });
      }
      throw new Error('No authenticated user');
    });
  }
}