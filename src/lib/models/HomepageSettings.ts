import mongoose, { Schema, models } from 'mongoose';

export interface IHomepageSettings {
  _id: string;
  selectedFeaturedCourses: string[];
  createdAt: Date;
  updatedAt: Date;
}

const homepageSettingsSchema = new Schema<IHomepageSettings>({
  selectedFeaturedCourses: {
    type: [String],
    default: [],
    validate: {
      validator: function(v: string[]) {
        return Array.isArray(v) && v.every(id => typeof id === 'string');
      },
      message: 'selectedFeaturedCourses must be an array of strings'
    }
  },
}, {
  timestamps: true,
});

// Ensure only one document exists for homepage settings
homepageSettingsSchema.pre('save', async function(next) {
  const count = await models.HomepageSettings?.countDocuments() || 0;
  if (count > 0 && !this.isNew) {
    // If updating, allow it
    return next();
  }
  if (count > 0 && this.isNew) {
    // If creating new and one already exists, prevent it
    const error = new Error('Only one homepage settings document can exist');
    return next(error);
  }
  next();
});

const HomepageSettings = models.HomepageSettings || mongoose.model<IHomepageSettings>('HomepageSettings', homepageSettingsSchema);

export default HomepageSettings;