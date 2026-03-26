import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Shell } from './layout/shell/shell';
import { DocumentIntelligence } from './pages/document-intelligence/document-intelligence';
import { DocumentLlmEc2 } from './pages/document-llm-ec2/document-llm-ec2';
import { Relay } from './pages/relay/relay';
import { Vista } from './pages/vista/vista';

export const routes: Routes = [
  { path: '', component: Home },
  {
    path: '',
    component: Shell,
    children: [
      { path: 'document-intelligence', component: DocumentIntelligence },
      { path: 'document-llm-ec2', component: DocumentLlmEc2 },
    ]
  },
  { path: 'relay', component: Relay },
  { path: 'vista', component: Vista },
  { path: '**', redirectTo: '' }
];
