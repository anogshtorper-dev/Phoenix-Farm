// src/api/entityFactory.js
// Creates a standard CRUD API object for a given endpoint path.
// Mirrors the Base44 entity interface:
//   .list()  .filter(params)  .get(id)  .create(data)  .update(id, data)  .delete(id)
import client from './client';

export function createEntityApi(path) {
  return {
    list: (params) => client.get(path, { params }),
    filter: (params) => client.get(path, { params }),
    get: (id) => client.get(`${path}/${id}`),
    create: (data) => client.post(path, data),
    update: (id, data) => client.put(`${path}/${id}`, data),
    delete: (id) => client.delete(`${path}/${id}`),
  };
}
