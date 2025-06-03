// src/app/services/room-allocation.service.ts
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { IRoomAllocationDetail } from '../../app/shared/models/room.types';

@Injectable({
  providedIn: 'root'
})
export class RoomAllocationService {

  private collectionPath = 'rooms';

  constructor(private firestore: AngularFirestore) {}
  
  getRooms(): Observable<IRoomAllocationDetail[]> {
    return this.firestore.collection<IRoomAllocationDetail>(this.collectionPath).valueChanges({ idField: 'roomId' });
  }
  

  addRoom(room: IRoomAllocationDetail): Promise<void> {
    const docRef = this.firestore.collection(this.collectionPath).doc(room.roomId);
    return docRef.set(room);
  }

  updateRoom(room: IRoomAllocationDetail): Promise<void> {
    return this.firestore.collection(this.collectionPath).doc(room.roomId).update(room);
  }

  deleteRoom(roomId: string): Promise<void> {
    return this.firestore.collection(this.collectionPath).doc(roomId).delete();
  }

  

}