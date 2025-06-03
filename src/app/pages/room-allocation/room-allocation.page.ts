import { Component, OnInit, OnDestroy } from '@angular/core';
import { RoomAllocationService } from '../../services/room-allocation.service';
import { 
  IRoomAllocationDetail,
  RoomType ,AllocationInput
} from '../../shared/models/room.types';
import { 
  initializeRoomAllocation,
  calculateRoomStatus 
} from '../../shared/utils/room.utils';


@Component({
  selector: 'app-room-allocation',
  templateUrl: './room-allocation.page.html',
  styleUrls: ['./room-allocation.page.scss'],
})
export class RoomAllocationPage implements OnInit {
  rooms: IRoomAllocationDetail[] = [];
  roomTypes: RoomType[] = [
    'GENERAL_WARD',
    'SEMI_PRIVATE',
    'PRIVATE',
    'SUITE',
    'ICU',
    'MATERNITY',
    'PEDIATRIC',
    'ISOLATION'
  ];

  newRoom: IRoomAllocationDetail = {
    roomId: '',
    roomNumber: '',
    roomType: 'GENERAL_WARD',
    location: '',
    totalBeds: 0,
    totalSeats: 0,
    singlePatientRoom: false,
    assignedStaff: [],
    allocationInput: { patientId: '', duration: null }, // ✅ Fix 1
    assignedStaffInput: '', // ✅ Fix 2
    status: 'EMPTY'
  };
  

  constructor(private roomService: RoomAllocationService) {}

  ngOnInit() {
    this.loadRooms();
  }

  loadRooms() {
    this.roomService.getRooms().subscribe(rooms => {
      this.rooms = rooms;
    });
  }

  addRoom() {
    if (!this.newRoom.roomId) return;
    
    // Initialize the room with proper arrays and suggested features
    const initializedRoom = initializeRoomAllocation(this.newRoom);
    
    // Calculate initial status
    initializedRoom.status = calculateRoomStatus(initializedRoom);
    
    // Add to database
    this.roomService.addRoom(initializedRoom).then(() => {
      // Reset form
      this.newRoom = {
        roomId: '',
        roomNumber: '',
        roomType: 'GENERAL_WARD',
        location: '',
        totalBeds: 0,
        totalSeats: 0,
        singlePatientRoom: false,
        assignedStaff: [],
        allocationInput: { patientId: '', duration: null }, // ✅ Fix 1
        assignedStaffInput: '', // ✅ Fix 2
        status: 'EMPTY'
      };
      
    });
  }

  deleteRoom(roomId: string) {
    this.roomService.deleteRoom(roomId);
  }

}