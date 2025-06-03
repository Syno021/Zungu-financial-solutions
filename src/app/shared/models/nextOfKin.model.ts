//src/app/shared/models/nextOfKin.model.ts
import { Address } from './address.model';

export interface NextOfKin {
  name: string;
  relationship: string;
  contactNumber: string;
  address: Address;
}
