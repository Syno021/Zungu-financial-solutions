// icd10-selection-modal.component.ts
import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { IICD10Code } from '../../models/IICD10Code.model';
import { ICD10CodeService } from 'src/app/services/icd-10-code.service';


@Component({
  selector: 'app-icd10-selection-modal',
  templateUrl: './icd10-selection-modal.component.html',
  styleUrls: ['./icd10-selection-modal.component.scss']
})
export class ICD10SelectionModalComponent implements OnInit {
  codes: IICD10Code[] = [];
  filteredCodes: IICD10Code[] = [];
  categories: string[] = [];
  selectedCategory: string = 'all';
  searchTerm: string = '';
  viewMode: 'list' | 'grid' = 'list';
  selectedCodes: IICD10Code[] = [];

  constructor(
    private modalCtrl: ModalController,
    private icd10Service: ICD10CodeService
  ) {}

  ngOnInit() {
    this.codes = this.icd10Service.getValidCodes();
    this.filteredCodes = [...this.codes];
    this.categories = ['all', ...this.icd10Service.getUniqueCategories()];
  }

  searchCodes() {
    this.filteredCodes = this.codes.filter(code => {
      const matchesSearch = 
        code.code.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        code.shortDescription.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesCategory = 
        this.selectedCategory === 'all' || 
        code.category === this.selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }

  filterByCategory(category: string) {
    this.selectedCategory = category;
    this.searchCodes();
  }

  selectCodes() {

  if(this.selectedCodes.length){
    this.modalCtrl.dismiss(this.selectedCodes);
  }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'list' ? 'grid' : 'list';
  }

 
  
  
    selectCode(code: IICD10Code) {

      const index = this.selectedCodes.indexOf(code);
      if (index === -1) {
        
        this.selectedCodes.push(code);
      } else {
       
        this.selectedCodes.splice(index, 1);
      }
    }
  
    isSelected(code: IICD10Code): boolean {
      return this.selectedCodes.includes(code);
    }
  }
  

