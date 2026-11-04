import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { productsService } from '../services/products.service';
import { AppError } from '../middlewares/error.middleware';

// Ensure uploads directory exists
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'product-documents');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer Storage Configuration for PDF Documents (.pdf)
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
    const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanProdId}-${Date.now()}-${safeBase}.pdf`);
  },
});

export const uploadPdfMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isPdfExtension = ext === '.pdf';
    const isPdfMime =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/x-pdf' ||
      file.mimetype === 'application/acrobat' ||
      file.mimetype === 'applications/vnd.pdf';

    if (isPdfExtension || isPdfMime) {
      cb(null, true);
    } else {
      cb(new AppError('Only official PDF documents (.pdf) are allowed. Other file formats are strictly rejected.', 400));
    }
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
      const { title, versionNotes } = req.body;
      const file = req.file;

      if (!productId) {
        throw new AppError('Product ID is required', 400);
      }
      if (!file) {
        throw new AppError('Product description PDF document (.pdf) is required', 400);
      }
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext !== '.pdf') {
        throw new AppError('Only PDF files (.pdf) are allowed. Other file formats are strictly rejected.', 400);
      }

      const document = await productsService.uploadDocument({
        productId,
        title,
        versionNotes,
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
      res.setHeader('Content-Type', fileInfo.mimeType || 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `${isInline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(fileInfo.fileName)}"`
      );
      res.setHeader('Content-Length', fileInfo.fileSize);

      const stream = fs.createReadStream(fileInfo.filePath);
      stream.pipe(res);
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
}

export const productsController = new ProductsController();

