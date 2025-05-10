import { apiRequest } from "./queryClient";

// User API
export async function loginUser(username: string, password: string) {
  const res = await apiRequest("POST", "/api/login", { username, password });
  return res.json();
}

export async function registerUser(userData: {
  username: string;
  password: string;
  name: string;
  email: string;
  role: string;
}) {
  const res = await apiRequest("POST", "/api/users", userData);
  return res.json();
}

// Agents API
export async function getAgents() {
  const res = await apiRequest("GET", "/api/agents", undefined);
  return res.json();
}

export async function getAgent(id: number) {
  const res = await apiRequest("GET", `/api/agents/${id}`, undefined);
  return res.json();
}

export async function createAgent(agentData: any) {
  const res = await apiRequest("POST", "/api/agents", agentData);
  return res.json();
}

export async function updateAgent(id: number, agentData: any) {
  const res = await apiRequest("PATCH", `/api/agents/${id}`, agentData);
  return res.json();
}

// Calls API
export async function getCalls() {
  const res = await apiRequest("GET", "/api/calls", undefined);
  return res.json();
}

export async function getCall(id: number) {
  const res = await apiRequest("GET", `/api/calls/${id}`, undefined);
  return res.json();
}

export async function createCall(callData: any) {
  const res = await apiRequest("POST", "/api/calls", callData);
  return res.json();
}

// Actions API
export async function getActions() {
  const res = await apiRequest("GET", "/api/actions", undefined);
  return res.json();
}

export async function getAction(id: number) {
  const res = await apiRequest("GET", `/api/actions/${id}`, undefined);
  return res.json();
}

export async function createAction(actionData: any) {
  const res = await apiRequest("POST", "/api/actions", actionData);
  return res.json();
}

// Phone Numbers API
export async function getPhoneNumbers() {
  const res = await apiRequest("GET", "/api/phone-numbers", undefined);
  return res.json();
}

export async function createPhoneNumber(phoneNumberData: any) {
  const res = await apiRequest("POST", "/api/phone-numbers", phoneNumberData);
  return res.json();
}

// Contact Groups API
export async function getContactGroups() {
  const res = await apiRequest("GET", "/api/contact-groups", undefined);
  return res.json();
}

export async function createContactGroup(contactGroupData: any) {
  const res = await apiRequest("POST", "/api/contact-groups", contactGroupData);
  return res.json();
}

// Contacts API
export async function getContacts() {
  const res = await apiRequest("GET", "/api/contacts", undefined);
  return res.json();
}

export async function createContact(contactData: any) {
  const res = await apiRequest("POST", "/api/contacts", contactData);
  return res.json();
}

// Campaigns API
export async function getCampaigns() {
  const res = await apiRequest("GET", "/api/campaigns", undefined);
  return res.json();
}

export async function createCampaign(campaignData: any) {
  const res = await apiRequest("POST", "/api/campaigns", campaignData);
  return res.json();
}

export async function updateCampaign(id: number, campaignData: any) {
  const res = await apiRequest("PATCH", `/api/campaigns/${id}`, campaignData);
  return res.json();
}

// Dashboard Metrics API
export async function getDashboardMetrics() {
  const res = await apiRequest("GET", "/api/metrics/dashboard", undefined);
  return res.json();
}
