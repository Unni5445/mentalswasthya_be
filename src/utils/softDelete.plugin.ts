import { Schema, Document, Model, Query } from 'mongoose';

export interface ISoftDelete {
  isDeleted: boolean;
  deletedAt?: Date | null;
  softDelete(): Promise<void>;
  restore(): Promise<void>;
}

export function softDeletePlugin(schema: Schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  });

  // Filter out deleted documents by default for find queries
  schema.pre(/^find/, function (this: Query<any, any>, next) {
    if (this.getFilter().includeDeleted) {
      delete this.getFilter().includeDeleted;
      return next();
    }
    this.where({ isDeleted: false });
    next();
  });

  // Filter out deleted documents for count queries
  schema.pre('countDocuments', function (this: Query<any, any>, next) {
    if (this.getFilter().includeDeleted) {
      delete this.getFilter().includeDeleted;
      return next();
    }
    this.where({ isDeleted: false });
    next();
  });

  // Add softDelete method to document instances
  schema.methods.softDelete = async function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    await this.save();
  };

  // Add restore method to document instances
  schema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = null;
    await this.save();
  };
}
