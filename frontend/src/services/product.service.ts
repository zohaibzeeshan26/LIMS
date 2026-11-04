import { api, getStoredToken } from '@/lib/api';
import { Product, ProductDocument } from '@/types/lims';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const productService = {
  getAll: () => api.get<Product[]>('/products'),

  getById: (id: string) => api.get<Product>(`/products/${id}`),

  getDocuments: (productId: string) =>
    api.get<ProductDocument[]>(`/products/${productId}/documents`),

  getCurrentDocument: (productId: string) =>
    api.get<ProductDocument | null>(`/products/${productId}/current-document`),

  uploadDocument: (productId: string, formData: FormData) =>
    api.upload<ProductDocument>(`/products/${productId}/documents`, formData),

  deleteDocument: (documentId: string) =>
    api.delete<{ success: boolean; message: string }>(`/product-documents/${documentId}`),

  getDocumentDownloadUrl: (documentId: string, download: boolean = true) => {
    const token = getStoredToken();
    const query = new URLSearchParams();
    if (download) query.append('download', 'true');
    if (token) query.append('token', token);
    return `${API_BASE}/product-documents/${documentId}/file?${query.toString()}`;
  },

  getDocumentViewUrl: (documentId: string) => {
    const token = getStoredToken();
    const query = new URLSearchParams();
    query.append('inline', 'true');
    if (token) query.append('token', token);
    return `${API_BASE}/product-documents/${documentId}/file?${query.toString()}`;
  },
};

