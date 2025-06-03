import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { Observable, forkJoin, from, of } from 'rxjs';
import firebase from 'firebase/compat/app';
import { Staff } from 'src/app/shared/models/staff.model';


export interface StaffActivityMetrics {
  staffId: string;
  name: string;
  role: string;
  totalPatientsAssigned: number;
  totalPrescriptionsIssued: number;
  totalLabOrdersProcessed: number;
  totalRadiologyOrdersProcessed: number;
  totalEhrUpdates: number;
  totalInventoryMovements: number;
  lastActivity: Date | null;
}

export interface AuditLog {
    id: string;
    staffId: string;
    staffName: string;
    action: string;
    entityType: 'patient' | 'ehr' | 'prescription' | 'labResult' | 'radiologyResult' | 'inventory' | 'room';
    entityId: string;
    details: string;
    timestamp: firebase.firestore.Timestamp | Date;
  }

export type TimeframeType = 'daily' | 'weekly' | 'monthly' | 'yearly';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
    private cachedData: Map<string, {data: any, timestamp: number}> = new Map();
private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  constructor(private firestore: AngularFirestore) {}

  /**
   * Get staff activity metrics for a facility
   */
  

getStaffActivityMetrics(facilityId: string, timeframe: TimeframeType): Observable<StaffActivityMetrics[]> {
    const startDate = this.getStartDateByTimeframe(timeframe);
    
    // Add console logs for debugging
    console.log('Fetching staff metrics for facility:', facilityId);
    console.log('Using start date:', startDate);
    
    // Get all staff for this facility
    return this.firestore.collection<Staff>('staff', ref => 
      ref.where('facilityId', '==', facilityId)
    ).get().pipe(
      tap(staffSnapshot => console.log('Staff snapshot size:', staffSnapshot.size)),
      switchMap(staffSnapshot => {
        if (staffSnapshot.empty) {
          console.log('No staff found for facility');
          return of([]); // Return empty array if no staff found
        }
        
        const staffMembers = staffSnapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, staffId: doc.id };
        });
        
        console.log('Staff members found:', staffMembers.length);
        
        // For each staff member, get their activity metrics
        const staffMetricsObservables = staffMembers.map(staff => 
          this.getIndividualStaffMetrics(staff, startDate).pipe(
            catchError(err => {
              console.error(`Error getting metrics for staff ${staff.staffId}:`, err);
              // Return default metrics instead of failing the entire operation
              return of({
                staffId: staff.staffId,
                name: staff.name,
                role: staff.role || 'Unknown',
                totalPatientsAssigned: 0,
                totalPrescriptionsIssued: 0,
                totalLabOrdersProcessed: 0,
                totalRadiologyOrdersProcessed: 0,
                totalEhrUpdates: 0,
                totalInventoryMovements: 0,
                lastActivity: null
              });
            })
          )
        );
        
        return forkJoin(staffMetricsObservables);
      }),
      catchError(err => {
        console.error('Error in staff metrics pipeline:', err);
        return of([]); // Return empty array on error
      })
    );
  }
  /**
   * Get audit logs for a specific staff member
   */
  getStaffAuditLogs(
    staffId: string, 
    timeframe: TimeframeType, 
    entityType?: string, 
    limit: number = 20, 
    startAfter?: any
  ): Observable<AuditLog[]> {
    const startDate = this.getStartDateByTimeframe(timeframe);
    
    console.log(`Getting audit logs for staff ${staffId}, timeframe: ${timeframe}, entityType: ${entityType || 'all'}`);
    
    try {
      let query = this.firestore.collection<AuditLog>('auditLogs', ref => {
        let q = ref.where('staffId', '==', staffId);
        
        // Add timestamp filter
        try {
          q = q.where('timestamp', '>=', startDate);
        } catch (err) {
          console.warn('Error adding timestamp filter to audit logs query:', err);
        }
        
        // Add ordering
        q = q.orderBy('timestamp', 'desc');
        
        // Add entity type filter if specified
        if (entityType && entityType !== 'null') {
          try {
            q = q.where('entityType', '==', entityType);
          } catch (err) {
            console.warn(`Error adding entityType filter (${entityType}) to audit logs query:`, err);
          }
        }
        
        // Add limit
        q = q.limit(limit);
        
        return q;
      });
      
      return query.get().pipe(
        tap(snapshot => console.log(`Audit logs query returned ${snapshot.size} documents`)),
        map(snapshot => {
          return snapshot.docs.map(doc => {
            try {
              const data = doc.data();
              const timestamp = data.timestamp;
              
             // Handle different timestamp formats
let formattedTimestamp: Date;
if (timestamp instanceof firebase.firestore.Timestamp) {
  formattedTimestamp = timestamp.toDate();
} else if (timestamp instanceof Date) {
  formattedTimestamp = timestamp;
} else if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
  // Use type assertion to tell TypeScript the shape of the object
  const firestoreTimestamp = {
    seconds: (timestamp as any).seconds,
    nanoseconds: (timestamp as any).nanoseconds || 0
  };
  formattedTimestamp = new firebase.firestore.Timestamp(
    firestoreTimestamp.seconds,
    firestoreTimestamp.nanoseconds
  ).toDate();
} else {
  formattedTimestamp = new Date(); // Default to current date if timestamp is invalid
}
              
              return {
                ...data,
                id: doc.id,
                timestamp: formattedTimestamp,
                // Ensure required fields have default values
                action: data.action || 'Unknown Action',
                entityType: data.entityType || 'unknown',
                entityId: data.entityId || 'unknown',
                details: data.details || 'No details available',
                staffName: data.staffName || 'Unknown Staff'
              };
            } catch (err) {
              console.error('Error processing audit log document:', err);
              // Return a default log entry instead of failing
              return {
                id: doc.id,
                staffId: staffId,
                staffName: 'Error Processing',
                action: 'Error',
                entityType: 'unknown' as any,
                entityId: 'unknown',
                details: 'Error processing this log entry',
                timestamp: new Date()
              };
            }
          });
        }),
        catchError(err => {
          console.error(`Error getting audit logs for staff ${staffId}:`, err);
          return of([]);
        })
      );
    } catch (err) {
      console.error('Error setting up audit logs query:', err);
      return of([]);
    }
  }

  /**
   * Get analytics dashboard summary for the facility
   */
  getFacilityAnalyticsSummary(facilityId: string, timeframe: TimeframeType): Observable<any> {
    const startDate = this.getStartDateByTimeframe(timeframe);
    
    console.log('Getting facility summary for:', facilityId, 'timeframe:', timeframe);
    console.log('Using start date:', startDate);
  
    // Create safer versions of each method with error handling
    const safeGetCount = (collection: string, field: string = 'issuedAt') => 
      this.getCollectionCountByTimeframe(collection, facilityId, startDate, field)
        .pipe(catchError(err => {
          console.error(`Error getting count for ${collection}:`, err);
          return of(0);
        }));
  
    const safeMostActiveStaff = this.getMostActiveStaff(facilityId, startDate)
      .pipe(catchError(err => {
        console.error('Error getting most active staff:', err);
        return of([]);
      }));
  
    const safeInventoryStats = this.getInventoryMovementStats(facilityId, startDate)
      .pipe(catchError(err => {
        console.error('Error getting inventory stats:', err);
        return of({ RESTOCK: 0, USAGE: 0, ADJUSTMENT: 0, TRANSFER: 0 });
      }));
  
    const safeRoomStats = this.getRoomUtilizationStats(facilityId, startDate)
      .pipe(catchError(err => {
        console.error('Error getting room stats:', err);
        return of({ activeRooms: 0, dischargedRooms: 0, totalAllocations: 0 });
      }));
  
    return forkJoin({
      totalPatients: safeGetCount('patients'),
      totalPrescriptions: safeGetCount('prescriptions'),
      totalLabResults: safeGetCount('labResults'),
      totalRadiologyResults: safeGetCount('radiologyResults'),
      totalEhrUpdates: safeGetCount('ehrs', 'lastUpdated'),
      mostActiveStaff: safeMostActiveStaff,
      inventoryMovements: safeInventoryStats,
      roomUtilization: safeRoomStats
    }).pipe(
      catchError(err => {
        console.error('Error in facility summary forkJoin:', err);
        // Return a default object with zeros instead of failing
        return of({
          totalPatients: 0,
          totalPrescriptions: 0,
          totalLabResults: 0,
          totalRadiologyResults: 0,
          totalEhrUpdates: 0,
          mostActiveStaff: [],
          inventoryMovements: { RESTOCK: 0, USAGE: 0, ADJUSTMENT: 0, TRANSFER: 0 },
          roomUtilization: { activeRooms: 0, dischargedRooms: 0, totalAllocations: 0 }
        });
      })
    );
  }
  
  /**
   * Track and record staff activity for audit purposes
   */
  logStaffActivity(
    staffId: string,
    staffName: string,
    action: string,
    entityType: 'patient' | 'ehr' | 'prescription' | 'labResult' | 'radiologyResult' | 'inventory' | 'room',
    entityId: string,
    details: string
  ): Observable<any> {
    const auditLog: Omit<AuditLog, 'id'> = {
      staffId,
      staffName,
      action,
      entityType,
      entityId,
      details,
      timestamp: firebase.firestore.Timestamp.fromDate(new Date())
    };
    
    return from(this.firestore.collection('auditLogs').add(auditLog));
  }
  // Private helper methods
  
  private getIndividualStaffMetrics(staff: Staff, startDate: firebase.firestore.Timestamp): Observable<StaffActivityMetrics> {
    const staffId = staff.staffId;
    
    return forkJoin({
      prescriptions: this.getCollectionCountForStaff('prescriptions', staffId, startDate).pipe(catchError(() => of(0))),
      labResults: this.getCollectionCountForStaff('labResults', staffId, startDate).pipe(catchError(() => of(0))),
      radiologyResults: this.getCollectionCountForStaff('radiologyResults', staffId, startDate).pipe(catchError(() => of(0))),
      ehrUpdates: this.getEhrUpdatesCount(staffId, startDate).pipe(catchError(() => of(0))),
      inventoryMovements: this.getInventoryMovementsCount(staffId, startDate).pipe(catchError(() => of(0))),
      lastActivity: this.getLastActivityTimestamp(staffId).pipe(catchError(() => of(null)))
    }).pipe(
      map(results => ({
        staffId: staff.staffId,
        name: staff.name || 'Unknown',
        role: staff.role || 'Unknown',
        totalPatientsAssigned: staff.assignedPatients?.length || 0,
        totalPrescriptionsIssued: results.prescriptions,
        totalLabOrdersProcessed: results.labResults,
        totalRadiologyOrdersProcessed: results.radiologyResults,
        totalEhrUpdates: results.ehrUpdates,
        totalInventoryMovements: results.inventoryMovements,
        lastActivity: results.lastActivity
      })),
      catchError(err => {
        console.error(`Error processing metrics for staff ${staffId}:`, err);
        return of({
          staffId: staff.staffId,
          name: staff.name || 'Unknown',
          role: staff.role || 'Unknown',
          totalPatientsAssigned: 0,
          totalPrescriptionsIssued: 0,
          totalLabOrdersProcessed: 0,
          totalRadiologyOrdersProcessed: 0,
          totalEhrUpdates: 0,
          totalInventoryMovements: 0,
          lastActivity: null
        });
      })
    );
  }

  private getCollectionCountForStaff(
    collection: string, 
    staffId: string, 
    startDate: firebase.firestore.Timestamp
  ): Observable<number> {
    return this.firestore.collection(collection, ref => 
      ref.where('staffId', '==', staffId)
         .where('issuedAt', '>=', startDate)
    ).get().pipe(
      map(snapshot => snapshot.size)
    );
  }
  
  private getEhrUpdatesCount(staffId: string, startDate: firebase.firestore.Timestamp): Observable<number> {
    // This assumes you're tracking which staff member updated an EHR
    // You might need to adjust this based on your actual data model
    return this.firestore.collection('auditLogs', ref => 
      ref.where('staffId', '==', staffId)
         .where('entityType', '==', 'ehr')
         .where('action', '==', 'update')
         .where('timestamp', '>=', startDate)
    ).get().pipe(
      map(snapshot => snapshot.size)
    );
  }
  
  private getInventoryMovementsCount(staffId: string, startDate: firebase.firestore.Timestamp): Observable<number> {
    return this.firestore.collection('inventoryMovements', ref => 
      ref.where('userId', '==', staffId)
         .where('createdAt', '>=', startDate)
    ).get().pipe(
      map(snapshot => snapshot.size)
    );
  }
  
  private getLastActivityTimestamp(staffId: string): Observable<Date | null> {
    return this.firestore.collection('auditLogs', ref => 
      ref.where('staffId', '==', staffId)
         .orderBy('timestamp', 'desc')
         .limit(1)
    ).get().pipe(
      map(snapshot => {
        if (snapshot.empty) {
          return null;
        }
        const data = snapshot.docs[0].data() as Record<string, unknown>;
        return (data['timestamp'] as firebase.firestore.Timestamp).toDate();
      })
    );
  }
  
  private getCollectionCountByTimeframe(
    collection: string, 
    facilityId: string, 
    startDate: firebase.firestore.Timestamp,
    dateField: string = 'issuedAt' // default field name
  ): Observable<number> {
    console.log(`Querying ${collection} collection with facilityId: ${facilityId}, dateField: ${dateField}`);
    
    return this.firestore.collection(collection, ref => {
      // Start with a basic query
      let query = ref.where('facilityId', '==', facilityId);
      
      // Add date filter if the collection has the field
      try {
        query = query.where(dateField, '>=', startDate);
      } catch (err) {
        console.warn(`Error adding date filter to ${collection} query:`, err);
        // Continue with just the facilityId filter
      }
      
      return query;
    }).get().pipe(
      tap(snapshot => console.log(`${collection} query returned ${snapshot.size} documents`)),
      map(snapshot => snapshot.size),
      catchError(err => {
        console.error(`Error querying ${collection}:`, err);
        return of(0); // Return 0 instead of failing
      })
    );
  }
  
  private getMostActiveStaff(facilityId: string, startDate: firebase.firestore.Timestamp): Observable<any> {
    return this.firestore.collection('auditLogs', ref => 
      ref.where('timestamp', '>=', startDate)
      // You might want to add a facilityId filter if your audit logs have it
      // .where('facilityId', '==', facilityId)
    ).get().pipe(
      tap(snapshot => console.log(`Audit logs query returned ${snapshot.size} documents`)),
      map(snapshot => {
        const staffActivity = new Map<string, { staffId: string, staffName: string, count: number }>();
        
        snapshot.docs.forEach(doc => {
          try {
            const data = doc.data() as Record<string, unknown>;
            const staffId = data['staffId'] as string;
            const staffName = data['staffName'] as string;
            
            if (!staffId) return; // Skip entries without staffId
            
            if (staffActivity.has(staffId)) {
              staffActivity.get(staffId)!.count++;
            } else {
              staffActivity.set(staffId, { staffId, staffName: staffName || 'Unknown', count: 1 });
            }
          } catch (err) {
            console.warn('Error processing audit log doc:', err);
            // Skip this document and continue
          }
        });
        
        // Convert to array and sort by activity count
        return Array.from(staffActivity.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5); // Top 5 most active staff
      }),
      catchError(err => {
        console.error('Error getting most active staff:', err);
        return of([]);
      })
    );
  }
  
  private getInventoryMovementStats(facilityId: string, startDate: firebase.firestore.Timestamp): Observable<any> {
    return this.firestore.collection('inventoryMovements', ref => {
      let query = ref.where('createdAt', '>=', startDate);
      // Add facilityId filter if your inventory movements have it
      if (facilityId) {
        try {
          query = query.where('facilityId', '==', facilityId);
        } catch (err) {
          console.warn('Error adding facilityId filter to inventory query:', err);
        }
      }
      return query;
    }).get().pipe(
      map(snapshot => {
        const movementsByType: Record<string, number> = {
          RESTOCK: 0,
          USAGE: 0,
          ADJUSTMENT: 0,
          TRANSFER: 0
        };
        
        snapshot.docs.forEach(doc => {
          try {
            const data = doc.data() as Record<string, unknown>;
            const type = data['movementType'] as string;
            if (type && type in movementsByType) {
              movementsByType[type]++;
            }
          } catch (err) {
            console.warn('Error processing inventory movement doc:', err);
          }
        });
        
        return movementsByType;
      }),
      catchError(err => {
        console.error('Error getting inventory stats:', err);
        return of({ RESTOCK: 0, USAGE: 0, ADJUSTMENT: 0, TRANSFER: 0 });
      })
    );
  }
  
  private getRoomUtilizationStats(facilityId: string, startDate: firebase.firestore.Timestamp): Observable<any> {
    return this.firestore.collection('roomAllocation', ref => {
      let query = ref.where('facilityId', '==', facilityId);
      
      try {
        query = query.where('startDate', '>=', startDate);
      } catch (err) {
        console.warn('Error adding date filter to room allocation query:', err);
      }
      
      return query;
    }).get().pipe(
      map(snapshot => {
        let activeRooms = 0;
        let dischargedRooms = 0;
        
        snapshot.docs.forEach(doc => {
          try {
            const data = doc.data() as Record<string, unknown>;
            if (data['status'] === 'Active') {
              activeRooms++;
            } else if (data['status'] === 'Discharged') {
              dischargedRooms++;
            }
          } catch (err) {
            console.warn('Error processing room allocation doc:', err);
          }
        });
        
        return {
          activeRooms,
          dischargedRooms,
          totalAllocations: snapshot.size
        };
      }),
      catchError(err => {
        console.error('Error getting room stats:', err);
        return of({ activeRooms: 0, dischargedRooms: 0, totalAllocations: 0 });
      })
    );
  }
  
  private getStartDateByTimeframe(timeframe: TimeframeType): firebase.firestore.Timestamp {
    const now = new Date();
    const startDate = new Date();
    
    switch(timeframe) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0); // Start of today
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'yearly':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return firebase.firestore.Timestamp.fromDate(startDate);
  }
}