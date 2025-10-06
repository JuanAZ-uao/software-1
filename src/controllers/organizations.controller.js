import * as orgService from '../services/organizations.service.js';

export async function getAllOrganizations(req, res) {
  try {
    const orgs = await orgService.getAllOrganizations();
    res.json(orgs);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function createOrganization(req, res) {
  try {
    const org = await orgService.createOrganization(req.body);
    res.status(201).json(org);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function updateOrganization(req, res) {
  try {
    const id = req.params.id;
    const updated = await orgService.updateOrganization(id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function deleteOrganization(req, res) {
  try {
    const id = req.params.id;
    await orgService.deleteOrganization(id);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}