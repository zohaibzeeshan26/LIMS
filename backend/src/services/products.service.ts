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
      orderBy: [
        { brandName: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            category: true,
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
      const currentDoc = prod.documents[0] || null;
      return {
        ...prod,
        documents: prod.documents,
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
    laboratory?: string;
    labName?: string;
    docType?: string;
    category?: string;
    file: Express.Multer.File;
    user: any;
  }) {
    if (!data.file) {
      throw new AppError('Document file is required', 400);
    }

    const targetLab = data.laboratory?.trim().toUpperCase() || 'GENERAL';
    const targetLabName =
      data.labName?.trim() ||
      (targetLab === 'GENERAL'
        ? 'General Quality Control Lab'
        : targetLab === 'PENICILLIN'
        ? 'Penicillin QC Lab'
        : targetLab === 'CEPHALOSPORIN'
        ? 'Cephalosporin Lab'
        : targetLab === 'MICROBIOLOGY'
        ? 'Microbiology Lab'
        : targetLab === 'SAF'
        ? 'Semi-Automated Formulation Lab'
        : `${targetLab.charAt(0) + targetLab.slice(1).toLowerCase()} Lab`);

    // 1. Resolve product brand name if an existing ID was passed
    let existingById: any = null;
    if (data.productId) {
      existingById = await prisma.product.findUnique({
        where: { id: data.productId },
        include: { documents: true },
      });
    }

    const targetBrandName = (existingById ? existingById.brandName : data.productId).trim();

    // 2. Find product specifically in the TARGET laboratory
    let product: any = null;
    if (existingById && existingById.laboratory === targetLab) {
      product = existingById;
    } else {
      product = await prisma.product.findFirst({
        where: {
          brandName: { equals: targetBrandName, mode: 'insensitive' },
          laboratory: targetLab,
        },
        include: { documents: true },
      });
    }

    // 3. If product does NOT exist in targetLab, create an independent record for this lab!
    // (Never modify or move a product from another laboratory)
    if (!product) {
      const baseSlug = targetBrandName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'product';
      const newId = `${baseSlug}-${targetLab.toLowerCase()}-${Date.now().toString(36)}`;
      const labCode = targetLab === 'PENICILLIN' ? 'PEN' : targetLab === 'CEPHALOSPORIN' ? 'CEP' : 'CLG';
      const atmCode = `QC/${labCode}/ATM-${Math.floor(100 + Math.random() * 900)}`;

      product = await prisma.product.create({
        data: {
          id: newId,
          brandName: targetBrandName,
          genericName: existingById ? existingById.genericName : targetBrandName,
          dosageForm: existingById ? existingById.dosageForm : 'Pharmaceutical Document / Spec',
          strength: existingById ? existingById.strength : 'Standard',
          packSize: existingById ? existingById.packSize : 'Commercial',
          laboratory: targetLab,
          labName: targetLabName,
          atmCode,
          version: existingById ? existingById.version : 'Version: 01',
          status: 'COMPENDIAL_READY',
          specs: 'Approved Specification Document',
          description: `Document record entry for ${targetBrandName} in ${targetLabName}.`,
          parameters: existingById && existingById.parameters?.length > 0
            ? existingById.parameters
            : ['Document Review', 'Monograph Verification'],
        },
        include: { documents: true },
      });
    }

    // Document category (e.g. STP_METHOD, FINISHED_SPEC, CORE_SPEC, CALCULATION_GUIDELINE, RAW_MATERIAL_SPEC, etc.)
    const docCategory = (data.docType || data.category || 'GENERAL_DOC').trim().toUpperCase();

    // Determine document version for this specific file
    const matchingDocs = product.documents.filter(
      (d) => d.fileName.toLowerCase() === data.file.originalname.toLowerCase()
    );
    const maxVersion = matchingDocs.length > 0
      ? Math.max(...matchingDocs.map((d) => d.version))
      : 0;
    const nextVersion = maxVersion + 1;

    // Only supersede previous revision if the exact same file name was uploaded again
    if (matchingDocs.length > 0) {
      await prisma.productDocument.updateMany({
        where: {
          productId: product.id,
          fileName: { equals: data.file.originalname, mode: 'insensitive' },
          isCurrent: true,
        },
        data: { isCurrent: false },
      });
    }

    const mimeType = data.file.mimetype || 'application/octet-stream';

    const defaultTitle = data.title?.trim() || `${data.file.originalname.replace(/\.[^/.]+$/, '')}`;
    const defaultNotes = nextVersion === 1
      ? `Uploaded ${data.file.originalname}`
      : (data.versionNotes?.trim() || `Superseded previous revision with version ${nextVersion}`);

    // Create new current document record
    const newDocument = await prisma.productDocument.create({
      data: {
        productId: product.id,
        productName: product.brandName,
        productCode: product.atmCode,
        category: docCategory,
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

  async deleteProduct(id: string, user: any) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { documents: true },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    for (const doc of product.documents) {
      if (fs.existsSync(doc.filePath)) {
        try {
          fs.unlinkSync(doc.filePath);
        } catch (e) {}
      }
    }

    await prisma.productDocument.deleteMany({
      where: { productId: id },
    });

    await prisma.product.delete({
      where: { id },
    });

    try {
      await prisma.auditTrail.create({
        data: {
          entityName: 'Product',
          entityId: id,
          action: 'PRODUCT_DELETED',
          performedById: user?.id || null,
          performedByName: user?.fullName || 'User',
          role: String(user?.role || 'ADMIN'),
          reasonForChange: `Deleted product ${product.brandName} (${product.atmCode})`,
          diffPayload: JSON.stringify({ deletedProductId: id, brandName: product.brandName }),
        },
      });
    } catch (e) {}

    return { success: true, message: `Product ${product.brandName} removed successfully` };
  }
}

export const productsService = new ProductsService();

