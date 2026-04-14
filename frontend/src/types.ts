// API types shared between frontend and backend

export interface Component {
  id: number;
  global_id: string;
  name: string;
  type: string;  // IfcWall, IfcColumn, IfcSlab, etc.
  storey: string;
  x: number;
  y: number;
  z: number;
  bbox_min_x: number | null;
  bbox_min_y: number | null;
  bbox_min_z: number | null;
  bbox_max_x: number | null;
  bbox_max_y: number | null;
  bbox_max_z: number | null;
  defect_count?: number;
}

export type DefectClass = 'crack' | 'spallation' | 'corrosion' | 'efflorescence' | 'exposed_rebar' | 'water_damage' | 'mould' | 'other';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type DefectStatus = 'new' | 'reviewed' | 'repairing' | 'fixed';

export interface Defect {
  id: number;
  photo_url: string;
  defect_class: DefectClass;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  gps_lat: number | null;
  gps_lng: number | null;
  floor: string;
  component_id: number | null;
  component_name: string | null;
  component_type: string | null;
  severity: Severity;
  status: DefectStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DefectCreate {
  defect_class: DefectClass;
  confidence: number;
  bbox: string; // "x,y,w,h"
  gps_lat?: number;
  gps_lng?: number;
  floor: string;
  severity?: Severity;
  notes?: string;
}

export interface User {
  id: number;
  username: string;
  role: 'inspector' | 'admin';
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface DefectStats {
  total: number;
  by_status: Record<DefectStatus, number>;
  by_severity: Record<Severity, number>;
  by_class: Record<string, number>;
  by_floor: Record<string, number>;
  recent: Defect[];
}

export interface Notification {
  id: number;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string | null;
}

export interface LocateResult {
  ifc_x: number;
  ifc_y: number;
  ifc_z: number;
  component: {
    id: number;
    name: string;
    type: string;
    distance: number;
  } | null;
}

export interface BcfComment {
  id: number;
  guid: string;
  text: string;
  author: string | null;
  created_at: string | null;
}

export interface BcfTopic {
  id: number;
  guid: string;
  title: string;
  description: string | null;
  topic_type: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  viewpoint: string | null;
  ifc_guids: string | null;
  defect_id: number | null;
  created_at: string;
  updated_at: string;
  comments: BcfComment[];
}

export interface BcfTopicCreate {
  title: string;
  description?: string;
  topic_type?: string;
  priority?: string;
  viewpoint?: string;
  ifc_guids?: string;
  defect_id?: number;
}
