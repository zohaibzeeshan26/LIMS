import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { productsService } from '../services/products.service';
import { renderDocumentToHtml } from '../services/document-viewer.service';
import { AppError } from '../middlewares/error.middleware';

// Ensure uploads directory exists
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'product-documents');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer Storage Configuration for All Document Types
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const productId = req.body?.productId || req.params?.id || 'doc';
    const cleanProdId = String(productId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanProdId}-${Date.now()}-${safeBase}${ext}`);
  },
});

export const uploadPdfMiddleware = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: (_req, _file, cb) => {
    // Allow any document file format (PDF, Word, Excel, PowerPoint, Text, Images, etc.)
    cb(null, true);
  },
});

// Alias for backwards compatibility
export const uploadWordMiddleware = uploadPdfMiddleware;

export class ProductsController {
  async getAllProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string;
      const laboratory = req.query.laboratory as string;
      const products = await productsService.getAllProducts({ search, laboratory });
      res.json(products);
    } catch (err) {
      next(err);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const product = await productsService.getProductById(id);
      res.json(product);
    } catch (err) {
      next(err);
    }
  }

  async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productsService.createProduct(req.body, req.user);
      res.status(201).json({
        success: true,
        message: `Product ${product.brandName} registered successfully`,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }

  async uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawProductId = req.body.productId || req.params.id;
      const productId = rawProductId ? String(rawProductId) : '';
      const { title, versionNotes, laboratory, labName, category, docType } = req.body;
      const file = req.file;

      if (!productId) {
        throw new AppError('Product ID / Name is required', 400);
      }
      if (!file) {
        throw new AppError('Document file is required', 400);
      }

      const document = await productsService.uploadDocument({
        productId,
        title,
        versionNotes,
        laboratory,
        labName,
        docType: docType || category,
        file,
        user: req.user,
      });

      res.status(201).json({
        success: true,
        message: `Product document version ${document.version} uploaded successfully`,
        data: document,
      });
    } catch (err) {
      next(err);
    }
  }

  async getProductDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const history = await productsService.getDocumentHistory(id);
      res.json(history);
    } catch (err) {
      next(err);
    }
  }

  async getCurrentDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const doc = await productsService.getCurrentDocumentByProductId(id);
      if (!doc) {
        res.status(404).json({ message: 'No document found for this product' });
        return;
      }
      res.json(doc);
    } catch (err) {
      next(err);
    }
  }

  async getDocumentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const doc = await productsService.getDocumentById(id);
      res.json(doc);
    } catch (err) {
      next(err);
    }
  }

  async streamDocumentFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const fileInfo = await productsService.getDocumentFileDetails(id);

      const isInline = req.query.inline === 'true' || req.query.view === 'true';
      const isDownload = req.query.download === 'true' || !isInline;
      const ext = path.extname(fileInfo.fileName).toLowerCase();

      // 1. Direct download request: stream original raw file
      if (isDownload) {
        res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(fileInfo.fileName)}"`
        );
        res.setHeader('Content-Length', fileInfo.fileSize);

        const stream = fs.createReadStream(fileInfo.filePath);
        stream.pipe(res);
        return;
      }

      // 2. In-app View request
      // If PDF, stream inline natively
      if (ext === '.pdf' || fileInfo.mimeType === 'application/pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${encodeURIComponent(fileInfo.fileName)}"`
        );
        res.setHeader('Content-Length', fileInfo.fileSize);

        const stream = fs.createReadStream(fileInfo.filePath);
        stream.pipe(res);
        return;
      }

      // If Word (.docx), Excel (.xlsx), or Text: render complete interactive document viewer
      const token = req.query.token ? String(req.query.token) : '';
      const downloadUrl = `/api/v1/product-documents/${id}/file?download=true${token ? '&token=' + token : ''}`;

      const renderedHtml = await renderDocumentToHtml({
        filePath: fileInfo.filePath,
        fileName: fileInfo.fileName,
        mimeType: fileInfo.mimeType,
        downloadUrl,
        title: (fileInfo.doc as any)?.title,
        version: (fileInfo.doc as any)?.version,
        productName: (fileInfo.doc as any)?.productName,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(renderedHtml);
    } catch (err) {
      next(err);
    }
  }

  async deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await productsService.deleteDocument(id, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await productsService.deleteProduct(id, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const productsController = new ProductsController();

