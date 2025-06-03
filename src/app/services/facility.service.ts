// First, import the Timestamp type from Firestore
import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Facility } from 'src/app/shared/models/facility.model';
import { CustomIdUtil } from 'src/app/shared/utils/customeId.util';
import firebase from 'firebase/compat/app'; // Add this import
@Injectable({
  providedIn: 'root'
})
export class FacilityService {
  private facilitiesCollection: AngularFirestoreCollection<Facility>;
  private collectionPath = 'facilities';

  constructor(private firestore: AngularFirestore) {
    this.facilitiesCollection = this.firestore.collection<Facility>(this.collectionPath);
  }

  /**
   * Create a new facility in Firestore
   * @param facility The facility data to add (without facilityId)
   * @returns Observable of the created facility with its ID
   */
  addFacility(facility: Omit<Facility, 'facilityId'>): Observable<Facility> {
    const facilityId = CustomIdUtil.generateFacilityId();
    const newFacility: Facility = {
      ...facility,
      facilityId,
      registeredAt: new Date()
    };

    return from(this.facilitiesCollection.doc(facilityId).set(newFacility))
      .pipe(
        map(() => newFacility),
        catchError(error => {
          console.error('Error adding facility:', error);
          return throwError(() => new Error('Failed to add facility. Please try again.'));
        })
      );
  }

  /**
   * Get all facilities from Firestore
   * @returns Observable array of facilities
   */
  getAllFacilities(): Observable<Facility[]> {
    return this.facilitiesCollection.snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as Facility;
          // Check if registeredAt is a Firestore Timestamp
          if (data.registeredAt && 
              typeof data.registeredAt !== 'string' && 
              'toDate' in data.registeredAt) {
            data.registeredAt = (data.registeredAt as firebase.firestore.Timestamp).toDate();
          }
          return data;
        })),
        catchError(error => {
          console.error('Error fetching facilities:', error);
          return throwError(() => new Error('Failed to load facilities. Please try again.'));
        })
      );
  }

  /**
   * Get a single facility by ID
   * @param facilityId The ID of the facility to retrieve
   * @returns Observable of the facility
   */
  getFacilityById(facilityId: string): Observable<Facility | null> {
    return this.firestore.doc<Facility>(`${this.collectionPath}/${facilityId}`).valueChanges()
      .pipe(
        map(facility => {
          if (!facility) return null;
          
          // Convert Firestore Timestamp to JavaScript Date if needed
          if (facility.registeredAt && 
              typeof facility.registeredAt !== 'string' && 
              'toDate' in facility.registeredAt) {
            facility.registeredAt = (facility.registeredAt as firebase.firestore.Timestamp).toDate();
          }
          return facility;
        }),
        catchError(error => {
          console.error(`Error fetching facility ${facilityId}:`, error);
          return throwError(() => new Error('Failed to load facility details. Please try again.'));
        })
      );
  }

  /**
   * Update an existing facility
   * @param facilityId The ID of the facility to update
   * @param facilityData The updated facility data
   * @returns Observable confirming the update
   */
  updateFacility(facilityId: string, facilityData: Partial<Omit<Facility, 'facilityId'>>): Observable<void> {
    return from(this.facilitiesCollection.doc(facilityId).update(facilityData))
      .pipe(
        catchError(error => {
          console.error(`Error updating facility ${facilityId}:`, error);
          return throwError(() => new Error('Failed to update facility. Please try again.'));
        })
      );
  }

  /**
   * Delete a facility by ID
   * @param facilityId The ID of the facility to delete
   * @returns Observable confirming the deletion
   */
  deleteFacility(facilityId: string): Observable<void> {
    return from(this.facilitiesCollection.doc(facilityId).delete())
      .pipe(
        catchError(error => {
          console.error(`Error deleting facility ${facilityId}:`, error);
          return throwError(() => new Error('Failed to delete facility. Please try again.'));
        })
      );
  }

  /**
   * Search facilities by name or type
   * @param searchTerm The search term to look for in facility names
   * @param type Optional facility type filter
   * @returns Observable array of matching facilities
   */
  searchFacilities(searchTerm: string, type?: Facility['type']): Observable<Facility[]> {
    let query = this.firestore.collection<Facility>(this.collectionPath, ref => {
      let baseQuery = ref.orderBy('name');
      
      if (searchTerm) {
        // Firebase doesn't support case-insensitive search, 
        // so we can search for terms that start with the search term
        baseQuery = baseQuery.where('name', '>=', searchTerm)
                             .where('name', '<=', searchTerm + '\uf8ff');
      }
      
      if (type) {
        baseQuery = baseQuery.where('type', '==', type);
      }
      
      return baseQuery;
    });

    return query.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Facility;
        // Convert Firestore Timestamp to JavaScript Date if needed
        if (data.registeredAt && 
            typeof data.registeredAt !== 'string' && 
            'toDate' in data.registeredAt) {
          data.registeredAt = (data.registeredAt as firebase.firestore.Timestamp).toDate();
        }
        return data;
      })),
      catchError(error => {
        console.error('Error searching facilities:', error);
        return throwError(() => new Error('Failed to search facilities. Please try again.'));
      })
    );
  }
}