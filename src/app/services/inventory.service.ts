// inventory.service.ts
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { IInventoryItem, IInventoryMovement, IInventoryAlert } from '../shared/models/invetory';
import { ScannerUtils } from '../shared/utils/scanner.utils';
import { Observable } from 'rxjs';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';


@Injectable({
    providedIn: 'root',
})
export class InventoryService {
    constructor(private firestore: AngularFirestore) {}

    async scanAndAddItem(barcodeData: string, facilityId: string = ''): Promise<IInventoryItem> {
        try {
            // Use external API for medication lookup (example using SAHPRA)
            const itemDetails = await this.lookupItemDetails(barcodeData);
             alert(itemDetails.toString() );
           
            const facilityIds = facilityId ? [facilityId] : []; // Create array with facility ID
    
            // Fix 2: Ensure all required properties are defined
            const newItem: IInventoryItem = {
                id: this.firestore.createId(),
                facilityId: facilityIds, // Use the facility ID from logged-in user
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
                barcode: barcodeData, // Ensure barcode is defined
                name: itemDetails.name || '', // Ensure required fields have default values
                description: itemDetails.description || '',
                category: itemDetails.category || 'MEDICATION',
                quantity: itemDetails.quantity || 0,
                reorderLevel: itemDetails.reorderLevel || 25,
                unit: itemDetails.unit || '',
                unitPrice: itemDetails.unitPrice || 0,
                supplier: itemDetails.supplier || '',
                location: '', // Required field in the interface
                minStock: itemDetails.minStock || 10,
                maxStock: itemDetails.maxStock || 1000,
                lastRestocked: new Date(), // Required field
                lastAudit: new Date(), // Required field
                insuranceCoverage: false, // Required field
                ndcCode: itemDetails.ndcCode,
                sahpraCode: itemDetails.sahpraCode,
            };
    
            await this.firestore
                .collection('inventory')
                .doc(newItem.id)
                .set(newItem);
            return newItem;
        } catch (error) {
            console.error('Error adding inventory item:', error);
            throw error;
        }
    }

    private async lookupItemDetails(
        barcode: string
        
    ): Promise<Partial<IInventoryItem>> {
        alert('barcode :'+barcode);
        // Example integration with SAHPRA API
        const response = await fetch(
            `https://api.sahpra.org.za/medicines?barcode=${barcode}`
        );
        const data = await response.json();
alert(data.toString());
        return {
            barcode,
            name: data.name,
            description: data.description,
            category: 'MEDICATION',
            unitPrice: data.priceZAR,
            ndcCode: data.ndcCode,
            sahpraCode: data.sahpraCode,
            unit: data.packSize,
            supplier: data.manufacturer,
            quantity: 0, // Initial quantity
            reorderLevel: data.reorderLevel || 25,
            minStock: data.minStock || 10,
            maxStock: data.maxStock || 1000,
        };
    }

    async updateStockLevel(
        itemId: string,
        quantity: number,
        movementType: IInventoryMovement['movementType'],
        userId: string,
        facilityId: string = ''
    ): Promise<void> {
        const batch = this.firestore.firestore.batch();
        const itemRef = this.firestore.collection('inventory').doc(itemId).ref;
    
        // Create facilityIds array
        const facilityIds = facilityId ? [facilityId] : [];
    
        // Add movement record
        const movement: IInventoryMovement = {
            id: this.firestore.createId(),
            itemId,
            quantity,
            movementType,
            notes: '',
            userId,
            facilityId: facilityIds, // Use the provided facilityId
            createdAt: firebase.firestore.FieldValue.serverTimestamp() as any,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() as any,
            isActive: true,
        };
    
        batch.set(
            this.firestore.collection('inventoryMovements').doc(movement.id)
                .ref,
            movement
        );
    
        // Update batch operations
        if (movementType === 'RESTOCK') {
            batch.update(itemRef, {
                quantity: firebase.firestore.FieldValue.increment(quantity),
                lastRestocked: firebase.firestore.FieldValue.serverTimestamp(),
            });
        } else if (movementType === 'USAGE') {
            batch.update(itemRef, {
                quantity: firebase.firestore.FieldValue.increment(-quantity),
            });
        }
    
        await batch.commit();
        this.checkInventoryAlerts(itemId);
    }

    // Update checkInventoryAlerts method
    private async checkInventoryAlerts(itemId: string): Promise<void> {
        const doc = await this.firestore
            .collection<IInventoryItem>('inventory')
            .doc(itemId)
            .get()
            .toPromise();
        const item = doc!.data();

        if (!item) return;

        const alerts: IInventoryAlert[] = [];

        if (item.quantity <= item.reorderLevel) {
            alerts.push(
                this.createAlert(
                    itemId,
                    'LOW_STOCK',
                    `Low stock alert: ${item.name} has ${item.quantity} remaining`
                )
            );
        }

        if (item.expirationDate && new Date(item.expirationDate) < new Date()) {
            alerts.push(
                this.createAlert(
                    itemId,
                    'EXPIRING',
                    `Expiration alert: ${item.name} expires on ${item.expirationDate}`
                )
            );
        }

        // Save the alerts
        for (const alert of alerts) {
            await this.firestore
                .collection('inventoryAlerts')
                .doc(alert.id)
                .set(alert);
        }
    }

    private createAlert(
        itemId: string,
        type: IInventoryAlert['alertType'],
        message: string
    ): IInventoryAlert {
        return {
            id: this.firestore.createId(),
            itemId,
            alertType: type,
            message,
            resolved: false,
            facilityId: [''], // To be populated
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
        };
    }

    async getInventoryByCategory(category: string): Promise<IInventoryItem[]> {
        const snapshot = await this.firestore
            .collection<IInventoryItem[]>('inventory', (ref) =>
                ref
                    .where('category', '==', category)
                    .where('isActive', '==', true)
            )
            .get()
            .toPromise();

        if (!snapshot || !snapshot.docs.length) {
            console.log('service empty');
            return []; // Handle undefined or empty data safely
        }

        return snapshot.docs.map((doc) => ({
            firestoreId: doc.id,
            ...doc.data(),
        })) as any;
    }

    // Improved getInventoryByFacility method to properly handle category filtering
    async getInventoryByFacility(facilityId: string, category?: string): Promise<IInventoryItem[]> {
        try {
            console.log(`Fetching inventory for facility: ${facilityId}, category: ${category || 'all'}`);
            
            // Create a base query for the facility
            let query = this.firestore.collection<IInventoryItem>('inventory', (ref) => {
                let baseQuery = ref
                    .where('isActive', '==', true)
                    .where('facilityId', 'array-contains', facilityId);
                
                // Only add category filter if a valid category is provided
                if (category && category !== '') {
                    baseQuery = baseQuery.where('category', '==', category);
                }
                
                return baseQuery;
            });
            
            const snapshot = await query.get().toPromise();
            
            if (!snapshot || snapshot.empty) {
                console.log(`No inventory items found for facility: ${facilityId}${category ? `, category: ${category}` : ''}`);
                return [];
            }
            
            const items = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id // Use the document ID as the item ID
                } as IInventoryItem;
            });
            
            console.log(`Found ${items.length} items for facility: ${facilityId}${category ? `, category: ${category}` : ''}`);
            return items;
            
        } catch (error) {
            console.error('Error fetching inventory by facility:', error);
            return [];
        }
    }

    async addManualItem(data: any): Promise<IInventoryItem> {
        // If facilityId is not provided in data, default to empty array
        const facilityIds = data.facilityId || [''];
        
        const newItem: IInventoryItem = {
            id: this.firestore.createId(),
            ...data,
            facilityId: facilityIds, // Use the provided facilityId array
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
            reorderLevel: data.reorderLevel || 25,
            minStock: data.minStock || 10,
            maxStock: data.maxStock || 1000,
        };
    
        await this.firestore
            .collection('inventory')
            .doc(newItem.id)
            .set(newItem);
        console.log('added new stock');
        return newItem;
    }

    async deleteItem(itemId: string): Promise<void> {
        await this.firestore.collection('inventory').doc(itemId).delete();

        console.log('deleted stock');
    }

    async updateItem(item: IInventoryItem): Promise<void> {
        await this.firestore.collection('inventory').doc(item.id).update(item);
        console.log('updated stock');
    }
}