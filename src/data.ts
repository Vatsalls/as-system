import { Project, DSREntry } from './types';

export const ADMIN_EMAILS = [
  'vatsalpatel1720@gmail.com',
  'admin@dsr.com',
  'admin@company.com'
];

export const DEFAULT_PROJECTS: Project[] = [
  { id: 'proj-1', name: 'Phoenix Redesign', code: 'PHX-RD', description: 'Modernizing internal workspace suite', domain: 'phoenix-workspace.com', frequency: 'Daily' },
  { id: 'proj-2', name: 'Apollo Cloud Platform', code: 'APL-CP', description: 'Next-gen cloud migration and hosting infrastructure', domain: 'apolloCloud.io', frequency: 'Weekly' },
  { id: 'proj-3', name: 'Infinity Portal Dev', code: 'INF-PD', description: 'Building unified client facing interfaces', domain: 'infinity-portal.co', frequency: 'Monthly' },
  { id: 'proj-4', name: 'Core API Integration', code: 'COR-API', description: 'Exposing third-party platform integration endpoints', domain: 'core-api-integration.com', frequency: 'Daily' }
];

// Seed some entries conforming to DSREntry with works list!
export const INITIAL_DSR_ENTRIES: DSREntry[] = [
  {
    id: 'dsr-1',
    date: '2026-06-05',
    userEmail: 'alex.rivera@company.com',
    works: [
      {
        id: 'work-1-1',
        projectId: 'proj-1',
        projectName: 'Phoenix Redesign',
        listingCount: 450,
        blogCount: 15,
        pdfCount: 2,
        imageCount: 4,
        blog: 'Completed UI mockup implementation on landing page. Tested responsiveness.',
        pdfName: 'Phoenix_UI_Spec_v2.pdf',
        pdfSize: '1.4 MB',
        imageUri: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=300&q=80',
        imageName: 'dashboard_screenshot.jpg',
        customValues: {
          'field-1': 0,
          'field-2': false,
          'field-3': 4
        }
      },
      {
        id: 'work-1-2',
        projectId: 'proj-3',
        projectName: 'Infinity Portal Dev',
        listingCount: 120,
        blogCount: 8,
        pdfCount: 0,
        imageCount: 1,
        blog: 'Synchronized sidebar menu triggers with React state controllers.',
        customValues: {
          'field-1': 1,
          'field-2': false,
          'field-3': 5
        }
      }
    ],
    createdAt: '2026-06-05T17:30:00Z'
  },
  {
    id: 'dsr-2',
    date: '2026-06-06',
    userEmail: 'samantha.chen@company.com',
    works: [
      {
        id: 'work-2-1',
        projectId: 'proj-2',
        projectName: 'Apollo Cloud Platform',
        listingCount: 820,
        blogCount: 22,
        pdfCount: 5,
        imageCount: 12,
        blog: 'Updated Docker configurations. Setup CI/CD pipelines in Dev sandbox.',
        pdfName: 'Apollo_Deployment_Guide.pdf',
        pdfSize: '840 KB',
        imageUri: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=300&q=80',
        imageName: 'metric_panel.png',
        customValues: {
          'field-1': 2,
          'field-2': false,
          'field-3': 5
        }
      }
    ],
    createdAt: '2026-06-06T18:15:00Z'
  },
  {
    id: 'dsr-3',
    date: '2026-06-07',
    userEmail: 'marcus.taylor@company.com',
    works: [
      {
        id: 'work-3-1',
        projectId: 'proj-4',
        projectName: 'Core API Integration',
        listingCount: 300,
        blogCount: 5,
        pdfCount: 0,
        imageCount: 2,
        blog: 'Developed OAuth bridge services. Optimized database operations.',
        customValues: {
          'field-1': 0,
          'field-2': true,
          'field-3': 3
        }
      }
    ],
    createdAt: '2026-06-07T16:45:00Z'
  },
  {
    id: 'dsr-4',
    date: '2026-06-08',
    userEmail: 'elena.rostova@company.com',
    works: [
      {
        id: 'work-4-1',
        projectId: 'proj-1',
        projectName: 'Phoenix Redesign',
        listingCount: 950,
        blogCount: 40,
        pdfCount: 8,
        imageCount: 15,
        blog: 'Ran end-to-end Cypress test suites. Fixed minor functional bugs in dashboard routing.',
        customValues: {
          'field-1': 1,
          'field-2': false,
          'field-3': 5
        }
      },
      {
        id: 'work-4-2',
        projectId: 'proj-4',
        projectName: 'Core API Integration',
        listingCount: 220,
        blogCount: 10,
        pdfCount: 1,
        imageCount: 3,
        blog: 'Resolved headers conflict with API gateways.',
        pdfName: 'API_headers_patch.pdf',
        pdfSize: '120 KB',
        customValues: {
          'field-1': 0,
          'field-2': false,
          'field-3': 4
        }
      }
    ],
    createdAt: '2026-06-08T17:50:00Z'
  },
  {
    id: 'dsr-5',
    date: '2026-06-09',
    userEmail: 'vatsalpatel1720@gmail.com', // Admin login seeding
    works: [
      {
        id: 'work-5-1',
        projectId: 'proj-3',
        projectName: 'Infinity Portal Dev',
        listingCount: 520,
        blogCount: 18,
        pdfCount: 3,
        imageCount: 6,
        blog: 'Implemented the primary email login authentication screen, dynamic uploader block, and nested project report list.',
        imageUri: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=300&q=80',
        imageName: 'working_prototype.png',
        customValues: {
          'field-1': 0,
          'field-2': false,
          'field-3': 5
        }
      }
    ],
    createdAt: '2026-06-09T10:15:00Z'
  }
];
