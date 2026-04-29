import { Document, Types } from "mongoose";

export interface ICustomer {
  businessType: string;
  businessName: string;
  name: string;
  email: string;
  phone: string;
  gstNo: string;
  gstCopy: string;
  address: string;
  shopPhoto: string;
  products: { product: string; mrp: number; sellPrice: number }[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICustomerModel extends Document, ICustomer {}
