export const hasRequiredReportPhoto = ({
  photoUris = [],
  existingPhotoPaths = [],
  isEditing = false,
} = {}) => (
  photoUris.length > 0
  || (isEditing && existingPhotoPaths.length > 0)
);
