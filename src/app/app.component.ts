import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  showMenuEnabled = false; // Whether menu should be enabled on this page
  menuOpen = false; // Whether menu is currently open
  activeRoute = '';
  menuItems = [
    { 
      title: 'Dashboard', 
      icon: 'grid-outline', 
      route: '/dashboard',
      color: 'primary'
    },
    { 
      title: 'Facilities', 
      icon: 'business-outline', 
      route: '/facilities',
      color: 'secondary'
    },
    {
      title: 'Diagnoses',
      icon: 'medkit-outline', 
      route: '/diagnoses',
      color: 'secondary'
    },
    
    { 
      title: 'Add Staff', 
      icon: 'add-circle-outline', 
      route: '/add-staff',
      color: 'secondary'
    },
    { 
      title: 'Add EHR', 
      icon: 'add-circle-outline', 
      route: '/add-ehr',
      color: 'secondary'
    },
    { 
      title: 'Staff', 
      icon: 'people-outline', 
      route: '/staff',
      color: 'sky'
    },
    // { 
    //   title: 'Patients', 
    //   icon: 'person-outline', 
    //   route: '/patients',
    //   color: 'mint'
    // },
    { 
      title: 'EHR', 
      icon: 'document-text-outline', 
      route: '/ehr',
      color: 'deep-blue'
    },
    { 
      title: 'Inventory', 
      icon: 'cube-outline', 
      route: '/inventory',
      color: 'sunshine'
    },
    { 
      title: 'Room Allocation', 
      icon: 'bed-outline', 
      route: '/room-allocation',
      color: 'primary'
    },
    { 
      title: 'Analytics', 
      icon: 'bar-chart-outline', 
      route: '/analytics',
      color: 'secondary'
    },
    
    { 
      title: 'Patient Card', 
      icon: 'card-outline', 
      route: '/patient-card',
      color: 'sky'
    }
  ];

  // Define the routes where the menu should be shown
  private allowedRoutes = [
    '/dashboard',
    '/facilities',
    '/staff',
    
    '/ehr',
    '/inventory',
    '/roomAllocation',
    '/analytics',
   
    '/patient-card',
    '/add-staff',
    '/add-ehr',
    '/diagnoses'
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // Subscribe to router events to determine if menu should be available
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      // Check if current route is in allowed routes
      const currentRoute = this.getBaseRoute(event.url);
      this.activeRoute = currentRoute;
      this.showMenuEnabled = this.allowedRoutes.some(route => currentRoute.startsWith(route));
      
      // Close the menu on route change
      this.menuOpen = false;
    });
  }

  // Helper method to get the base route from the current URL
  private getBaseRoute(url: string): string {
    // Split the URL by '/' and get the first segment after the domain
    const segments = url.split('/');
    if (segments.length > 1) {
      return '/' + segments[1];
    }
    return url;
  }

  // Toggle menu open/closed
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  // Navigate to the selected route
  navigateTo(route: string) {
    this.router.navigate([route]);
    // Close the menu after navigation
    this.menuOpen = false;
  }
  // Get the title of the active menu item
  getActiveMenuTitle(): string {
    const activeItem = this.menuItems.find(item => item.route === this.activeRoute);
    return activeItem ? activeItem.title : 'Healixir';
  }
}