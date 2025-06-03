import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RoomAllocationService } from '../../services/room-allocation.service';
import { 
  IRoomAllocationDetail, 
  RoomType,
  TimeSlot,
  BedAllocation,
  SeatAllocation 
} from '../../shared/models/room.types';

import { 
  getOccupancyDetails, 
  calculateRoomStatus, 
  isTimeSlotActive,
  checkTimeSlotOverlap 
} from '../../shared/utils/room.utils';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService, AuthUser } from '../../services/auth.service';
import { Patient } from 'src/app/shared/models/patient.model';

import { AlertController } from '@ionic/angular';
import { map } from 'rxjs/operators';


@Component({
  selector: 'app-room-list',
  templateUrl: './room-list.page.html',
  styleUrls: ['./room-list.page.scss'],
})
export class RoomListPage implements OnInit {
  rooms: IRoomAllocationDetail[] = [];
  filteredRooms: IRoomAllocationDetail[] = [];
  filterForm: FormGroup;
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
  
  statusOptions = [
    'EMPTY',
    'LESS THAN HALF',
    'HALF FULL',
    'ALMOST FULL',
    'FULL'
  ];
  patients: Patient[] = [];
  currentFacilityId: string = '';
  private refreshInterval: any;
  constructor(
    private roomService: RoomAllocationService,
    private fb: FormBuilder,
    private alertCtrl: AlertController,
    private alertController: AlertController,
    private firestore: AngularFirestore,
    private authService: AuthService // Add auth service
  ) {
    this.filterForm = this.fb.group({
      roomType: [''],
      status: [''],
      location: [''],
      minBeds: [''],
      maxBeds: [''],
      searchTerm: ['']
    });
  }


  ngOnInit() {
    this.loadRooms();
    this.getCurrentUserAndLoadPatients();
    this.refreshInterval = setInterval(() => {
      this.updateRoomStatuses();
    }, 60000);
    
    // Debug logging
    setTimeout(() => {
      this.rooms.forEach(room => {
        if (room.bedAllocation) {
          room.bedAllocation.forEach(bed => {
            console.log('Bed allocation:', bed);
            console.log('Time left:', this.calculateTimeLeft(bed));
          });
        }
      });
    }, 1000);
  }
  
  private getCurrentUserAndLoadPatients() {
    this.authService.getCurrentUser().subscribe((user: AuthUser | null) => {
      if (user) {
        // Extract facilityId based on user type
        if (user.type === 'facility') {
          this.currentFacilityId = user.data.facilityId;
        } else if (user.type === 'staff') {
          this.currentFacilityId = user.data.facilityId;
        } else if (user.type === 'patient') {
          this.currentFacilityId = user.data.facilityId;
        }
        
        if (this.currentFacilityId) {
          this.loadPatientsByFacility();
        } else {
          console.error('No facility ID found for current user');
        }
      }
    });
  }
  
  private loadPatientsByFacility() {
    this.firestore.collection<Patient>('patients', ref => 
      ref.where('facilityId', '==', this.currentFacilityId)
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Patient;
        const id = a.payload.doc.id;
        return { ...data, patientId: id };
      }))
    ).subscribe(patients => {
      this.patients = patients;
      console.log(`Loaded ${patients.length} patients for facility ${this.currentFacilityId}`);
    });
  }
  
  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
  
  private updateRoomStatuses() {
    this.rooms = this.rooms.map(room => ({
      ...room,
      status: calculateRoomStatus(room)
    }));
    this.applyFilters();
  }

  calculateTimeLeft(allocation: BedAllocation | SeatAllocation): string {
    if (!allocation || !allocation.endTime) return 'N/A';
    
    try {
      const now = new Date();
      let endTime: Date;
      
      // Check if endTime is a Firestore Timestamp
      if (allocation.endTime && 
          typeof allocation.endTime === 'object' && 
          'seconds' in allocation.endTime && 
          'nanoseconds' in allocation.endTime) {
        // Convert Firestore Timestamp to JavaScript Date
        const timestamp = allocation.endTime as any;
        endTime = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
      } else {
        // Try normal Date parsing
        endTime = new Date(allocation.endTime);
      }
      
      // Check if endTime is valid
      if (isNaN(endTime.getTime())) {
        console.error('Invalid date after conversion:', allocation.endTime);
        return 'Invalid Date';
      }
      
      const diff = endTime.getTime() - now.getTime();
      
      if (diff <= 0) return 'Expired';
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes}m`;
    } catch (error) {
      console.error('Error calculating time left:', error);
      return 'Error';
    }
  }
  applyFilters() {
    const filters = this.filterForm.value;
    
    this.filteredRooms = this.rooms.filter(room => {
      const matchesRoomType = !filters.roomType || room.roomType === filters.roomType;
      const matchesStatus = !filters.status || room.status === filters.status;
      const matchesLocation = !filters.location || 
        room.location.toLowerCase().includes(filters.location.toLowerCase());
      const matchesMinBeds = !filters.minBeds || room.totalBeds >= filters.minBeds;
      const matchesMaxBeds = !filters.maxBeds || room.totalBeds <= filters.maxBeds;
      const matchesSearch = !filters.searchTerm || 
        room.roomNumber.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        room.location.toLowerCase().includes(filters.searchTerm.toLowerCase());
      
      return matchesRoomType && matchesStatus && matchesLocation && 
             matchesMinBeds && matchesMaxBeds && matchesSearch;
    });
  }



 

  resetFilters() {
    this.filterForm.reset();
  }



  async assignStaff(room: IRoomAllocationDetail) {
    if (!room.assignedStaffInput?.trim()) {
      const alert = await this.alertCtrl.create({
        message: 'Please enter staff name.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }
    
    room.assignedStaff.push(room.assignedStaffInput.trim());
    room.assignedStaffInput = '';
    await this.roomService.updateRoom(room);
  }

  getUniqueRoomTypes(): RoomType[] {
    return [...new Set(this.filteredRooms.map(room => room.roomType))];
  }
  
  getRoomsByType(type: RoomType): IRoomAllocationDetail[] {
    return this.filteredRooms.filter(room => room.roomType === type);
  }
  
  getRoomTypeIcon(type: RoomType): string {
    const iconMap = {
      'GENERAL_WARD': 'business-outline',
      'SEMI_PRIVATE': 'people-outline',
      'PRIVATE': 'person-outline',
      'SUITE': 'home-outline',
      'ICU': 'pulse-outline',
      'MATERNITY': 'heart-outline',
      'PEDIATRIC': 'child-outline',
      'ISOLATION': 'shield-outline'
    };
    return iconMap[type] || 'bed-outline';
  }
  
  getRoomStatusColor(status: string): string {

    switch (status) {
      case 'EMPTY': return 'success';
      case 'LESS THAN HALF': return 'primary';
      case 'HALF FULL': return 'tertiary';
      case 'ALMOST FULL': return 'warning';
      case 'FULL': return 'danger';
      default: return 'medium';
    }
  }
  



   loadRooms() {
    this.roomService.getRooms().subscribe(rooms => {
      this.rooms = rooms.map(room => ({
        ...room,
        // Preserve existing allocations while adding new properties
        bedAllocation: room.bedAllocation || [],
        seatAllocation: room.seatAllocation || [],
        allocationInput: { patientId: '', duration: null },
        assignedStaffInput: '',
        assignedStaff: room.assignedStaff || []
      }));
      this.applyFilters();
    });
  }





 

  getOccupancyColor(occupied: number, total: number): string {
    
    if (total === 0) return 'medium';
    const ratio = occupied / total;
    
    if (ratio === 0) return 'success';
    if (ratio <= 0.33) return 'primary';
    if (ratio <= 0.66) return 'warning';
    return 'danger';
  }

 
 


  private async processAllocation(
    room: IRoomAllocationDetail,
    type: 'bed' | 'seat',
    patientId: string,
    duration: number
  ): Promise<{ success: boolean; message: string }> {
    const now = new Date();
    const endTime = new Date(now.getTime() + (duration * 60 * 60 * 1000));
  
    // Get patient details for the message
    const patient = this.patients.find(p => p.patientId === patientId);
    const patientName = patient ? patient.name : patientId;
  
    try {
      if (type === 'bed') {
        const availableBed = room.bedAllocation?.find(bed => 
          !bed.patientId || new Date(bed.endTime!) < now
        );
  
        if (!availableBed) {
          return { success: false, message: 'No available beds' };
        }
  
        // Clear previous allocation
        availableBed.patientId = patientId;
        availableBed.startTime = now;
        availableBed.endTime = endTime;
  
        return { 
          success: true, 
          message: `Allocated bed ${availableBed.bedNumber} to ${patientName} for ${duration} hours`
        };
      } else {
        const availableSeat = room.seatAllocation?.find(seat => 
          !seat.patientId || new Date(seat.endTime!) < now
        );
  
        if (!availableSeat) {
          return { success: false, message: 'No available seats' };
        }
  
        availableSeat.patientId = patientId;
        availableSeat.startTime = now;
        availableSeat.endTime = endTime;
  
        return { 
          success: true, 
          message: `Allocated seat ${availableSeat.seatNumber} to ${patientName} for ${duration} hours`
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Allocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    } finally {
      room.status = calculateRoomStatus(room);
      this.clearExpiredAllocations(room);
    }
  }
  
  private clearExpiredAllocations(room: IRoomAllocationDetail) {
    const now = new Date();
    
    room.bedAllocation?.forEach(bed => {
      if (bed.endTime && new Date(bed.endTime) < now) {
        bed.patientId = undefined;
        bed.startTime = undefined;
        bed.endTime = undefined;
      }
    });
  
    room.seatAllocation?.forEach(seat => {
      if (seat.endTime && new Date(seat.endTime) < now) {
        seat.patientId = undefined;
        seat.startTime = undefined;
        seat.endTime = undefined;
      }
    });
  }

  async allocateSpace(room: IRoomAllocationDetail, type: 'bed' | 'seat') {
    // Check if patients are loaded
    if (this.patients.length === 0) {
      const alert = await this.alertCtrl.create({
        header: 'No Patients',
        message: 'No patients found for this facility. Please add patients first.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }
  
    // Create the patient selection dialog with proper typing
    const patientInputs = this.patients.map((patient, index) => ({
      name: 'patientId',
      type: 'radio' as const, // Use type assertion with 'as const'
      label: `${patient.name} (${patient.patientId})`,
      value: patient.patientId,
      checked: index === 0
    }));
  
    const patientSelectAlert = await this.alertCtrl.create({
      header: `Select Patient for ${type === 'bed' ? 'Bed' : 'Seat'} Allocation`,
      inputs: patientInputs,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Next',
          handler: (patientId) => {
            if (!patientId) {
              this.showAlert('Please select a patient');
              return false;
            }
            
            // Proceed to duration selection
            this.showDurationDialog(room, type, patientId);
            return true;
          }
        }
      ]
    });
  
    await patientSelectAlert.present();
  }
  
  async showDurationDialog(room: IRoomAllocationDetail, type: 'bed' | 'seat', patientId: string) {
    const durationAlert = await this.alertCtrl.create({
      header: 'Allocation Duration',
      inputs: [
        {
          name: 'duration',
          type: 'number' as const, // Use type assertion with 'as const'
          placeholder: 'Duration (Hours)',
          min: 1,
          value: 12 // Default value
        }
      ],
      buttons: [
        {
          text: 'Back',
          handler: () => {
            // Go back to patient selection
            setTimeout(() => {
              this.allocateSpace(room, type);
            }, 100);
            return false;
          }
        },
        {
          text: 'Allocate',
          handler: async (data) => {
            if (!data.duration || data.duration <= 0) {
              await this.showAlert('Please enter a valid duration.');
              return false;
            }
            
            const result = await this.processAllocation(room, type, patientId, data.duration);
            
            if (result.success) {
              // Update room status immediately after successful allocation
              room.status = calculateRoomStatus(room);
              await this.roomService.updateRoom(room);
              this.loadRooms();
            }
            
            await this.showAlert(result.message);
            return result.success;
          }
        }
      ]
    });
  
    await durationAlert.present();
  }

  private async showAlert(message: string) {
    const alert = await this.alertCtrl.create({
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  getOccupancyDetails(room: IRoomAllocationDetail) {
    return getOccupancyDetails(room);
  }



 

 
}