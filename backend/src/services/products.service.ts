import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

export class ProductsService {
  async getAllProducts(query?: { search?: string; laboratory?: string }) {
    const where: any = {};

    if (query?.laboratory && query.laboratory !== 'ALL') {
      where.laboratory = query.laboratory.toUpperCase();
    }

    if (query?.search) {
      const term = query.search.trim();
      where.OR = [
        { brandName: { contains: term, mode: 'insensitive' } },
        { genericName: { contains: term, mode: 'insensitive' } },
        { atmCode: { contains: term, mode: 'insensitive' } },
        { dosageForm: { contains: term, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { brandName: 'asc' },
      include: {
        documents: {
          orderBy: { version: 'desc' },
          select: {
            id: true,
            title: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            version: true,
            versionNotes: true,
            uploadedById: true,
            uploadedByName: true,
            isCurrent: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return products.map((prod) => {
      const currentDoc = prod.documents.find((d) => d.isCurrent) || prod.documents[0] || null;
      return {
        ...prod,
        currentDocument: currentDoc,
        totalDocuments: prod.documents.length,
      };
    });
  }

  async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { version: 'desc' },
          include: {
            uploadedBy: {
              select: {
                id: true,
                fullName: true,
                employeeId: true,
                role: true,
                department: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const currentDocument = product.documents.find((d) => d.isCurrent) || product.documents[0] || null;

    return {
      ...product,
      currentDocument,
    };
  }

  async createProduct(
    data: {
      brandName: string;
      genericName?: string;
      dosageForm?: string;
      strength?: string;
      packSize?: string;
      laboratory?: string;
      labName?: string;
      atmCode?: string;
      version?: string;
      status?: string;
      specs?: string;
      description?: string;
      parameters?: string[];
    },
    user?: any
  ) {
    if (!data.brandName?.trim()) {
      throw new AppError('Product Brand Name is required', 400);
    }

    const cleanName = data.brandName.trim();
    const baseSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'product';
    let id = baseSlug;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (existing) {
      id = `${baseSlug}-${Date.now().toString(36)}`;
    }

    const lab = (data.laboratory || 'GENERAL').toUpperCase();
    const labName =
      data.labName?.trim() ||
      (lab === 'CEPHALOSPORIN'
        ? 'Cephalosporin Lab (SAF)'
        : lab === 'PENICILLIN'
        ? 'Penicillin Lab (PEN)'
        : 'Chemical Lab General (CLG)');
    const atmCode =
      data.atmCode?.trim() || `QC/${lab.slice(0, 3)}/ATM-${Math.floor(100 + Math.random() * 900)}`;

    const product = await prisma.product.create({
      data: {
        id,
        brandName: cleanName,
        genericName: data.genericName?.trim() || cleanName,
        dosageForm: data.dosageForm?.trim() || 'Solid / Liquid Formulation',
        strength: data.strength?.trim() || 'Standard Strength',
        packSize: data.packSize?.trim() || 'Commercial Pack',
        laboratory: lab,
        labName,
        atmCode,
        version: data.version?.trim() || 'Version: 01 (USP 2026)',
        status: data.status || 'COMPENDIAL_READY',
        specs: data.specs?.trim() || 'USP 2026 / BP 2025 Approved Monograph',
        description:
          data.description?.trim() || `Approved pharmaceutical specification protocol for ${cleanName}.`,
        parameters:
          Array.isArray(data.parameters) && data.parameters.length > 0
            ? data.parameters
            : ['Physical Description', 'Assay % (90.0% - 110.0%)', 'Related Substances'],
      },
      include: {
        documents: true,
      },
    });

    try {
      await prisma.auditTrail.create({
        data: {
          entityName: 'Product',
          entityId: product.id,
          action: 'PRODUCT_REGISTERED',
          performedById: user?.id || null,
          performedByName: user?.fullName || 'Documentation Manager',
          role: String(user?.role || 'DOCUMENTATION_MANAGER'),
          reasonForChange: `Registered new commercial product ${product.brandName} (${product.atmCode})`,
          diffPayload: JSON.stringify({
            id: product.id,
            brandName: product.brandName,
            genericName: product.genericName,
            atmCode: product.atmCode,
            laboratory: product.laboratory,
          }),
        },
      });
    } catch (e) {}

    return product;
  }

  async uploadDocument(data: {
    productId: string;
    title?: string;
    versionNotes?: string;
    file: Express.Multer.File;
    user: any;
  }) {
    if (!data.file) {
      throw new AppError('Word document file (.doc or .docx) is required', 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      include: {
        documents: true,
      },
    });

    if (!product) {
      if (fs.existsSync(data.file.path)) {
        try { fs.unlinkSync(data.file.path); } catch (e) {}
      }
      throw new AppError(`Product with ID "${data.productId}" not found`, 404);
    }

    // Determine document version
    const maxVersion = product.documents.length > 0
      ? Math.max(...product.documents.map((d) => d.version))
      : 0;
    const nextVersion = maxVersion + 1;

    // Mark previous documents for this product as isCurrent = false
    await prisma.productDocument.updateMany({
      where: { productId: product.id, isCurrent: true },
      data: { isCurrent: false },
    });

    const mimeType = 'application/pdf';

    const defaultTitle = `${product.brandName} - Product Description PDF Document (v${nextVersion})`;
    const defaultNotes = nextVersion === 1
      ? 'Initial product description PDF document upload'
      : (data.versionNotes?.trim() || `Superseded previous revision with version ${nextVersion}`);

    // Create new current document record
    const newDocument = await prisma.productDocument.create({
      data: {
        productId: product.id,
        productName: product.brandName,
        productCode: product.atmCode,
        category: product.laboratory,
        title: data.title?.trim() || defaultTitle,
        fileName: data.file.originalname,
        fileSize: data.file.size,
        mimeType,
        filePath: data.file.path,
        version: nextVersion,
        versionNotes: defaultNotes,
        uploadedById: data.user?.id || null,
        uploadedByName: data.user?.fullName || 'Documentation Manager',
        isCurrent: true,
      },
    });

    // 21 CFR Part 11 ALCOA+ Audit Trail
    try {
      await prisma.auditTrail.create({
        data: {
          entityName: 'ProductDocument',
          entityId: newDocument.id,
          action: nextVersion === 1 ? 'PRODUCT_DOCUMENT_UPLOADED' : 'PRODUCT_DOCUMENT_VERSION_UPDATED',
          performedById: data.user?.id || null,
          performedByName: data.user?.fullName || 'Documentation Manager',
          role: String(data.user?.role || 'DOCUMENTATION_MANAGER'),
          reasonForChange: `Uploaded ${nextVersion === 1 ? 'initial' : 'version ' + nextVersion} product description PDF document for ${product.brandName} (${product.atmCode}): ${data.file.originalname} (${(data.file.size / 1024).toFixed(1)} KB)`,
          diffPayload: JSON.stringify({
            productId: product.id,
            productName: product.brandName,
            productCode: product.atmCode,
            version: nextVersion,
            fileName: data.file.originalname,
            fileSize: data.file.size,
            versionNotes: defaultNotes,
          }),
        },
      });
    } catch (auditErr) {
      console.warn('Could not write audit trail for document upload:', auditErr);
    }

    return newDocument;
  }

  async getDocumentHistory(productId: string) {
    const documents = await prisma.productDocument.findMany({
      where: { productId },
      orderBy: { version: 'desc' },
      include: {
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            role: true,
            department: true,
          },
        },
      },
    });

    return documents;
  }

  async getCurrentDocumentByProductId(productId: string) {
    const doc = await prisma.productDocument.findFirst({
      where: { productId, isCurrent: true },
      orderBy: { version: 'desc' },
      include: {
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            role: true,
          },
        },
      },
    });

    if (!doc) {
      return prisma.productDocument.findFirst({
        where: { productId },
        orderBy: { version: 'desc' },
      });
    }

    return doc;
  }

  async getDocumentById(id: string) {
    const doc = await prisma.productDocument.findUnique({
      where: { id },
      include: {
        product: true,
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            role: true,
            department: true,
          },
        },
      },
    });

    if (!doc) {
      throw new AppError('Document not found', 404);
    }

    return doc;
  }

  async getDocumentFileDetails(id: string) {
    const doc = await prisma.productDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new AppError('Document not found', 404);
    }

    if (!fs.existsSync(doc.filePath)) {
      throw new AppError('Document file does not exist on disk storage', 404);
    }

    return {
      filePath: doc.filePath,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      doc,
    };
  }

  async deleteDocument(id: string, user: any) {
    const doc = await prisma.productDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new AppError('Document not found', 404);
    }

    if (doc.isCurrent) {
      const remainingDocs = await prisma.productDocument.findMany({
        where: { productId: doc.productId, id: { not: id } },
        orderBy: { version: 'desc' },
      });
      if (remainingDocs.length > 0) {
        await prisma.productDocument.update({
          where: { id: remainingDocs[0].id },
          data: { isCurrent: true },
        });
      }
    }

    if (fs.existsSync(doc.filePath)) {
      try {
        fs.unlinkSync(doc.filePath);
      } catch (err) {
        console.warn('Could not remove file from disk:', err);
      }
    }

    await prisma.productDocument.delete({
      where: { id },
    });

    try {
      await prisma.auditTrail.create({
        data: {
          entityName: 'ProductDocument',
          entityId: id,
          action: 'PRODUCT_DOCUMENT_DELETED',
          performedById: user?.id || null,
          performedByName: user?.fullName || 'User',
          role: String(user?.role || 'ADMIN'),
          reasonForChange: `Deleted version ${doc.version} of product description document for product ${doc.productName} (${doc.productCode})`,
          diffPayload: JSON.stringify({
            deletedDocId: id,
            productId: doc.productId,
            version: doc.version,
            fileName: doc.fileName,
          }),
        },
      });
    } catch (auditErr) {}

    return { success: true, message: 'Document removed successfully' };
  }
}

export const productsService = new ProductsService();

