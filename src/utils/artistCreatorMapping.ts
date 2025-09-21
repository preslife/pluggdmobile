// Mapping between legacy artist names and creator profiles
export const artistToCreatorMapping: Record<string, string> = {
  "D'yani": "c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f", // Temporarily map to Lord Tokumbo
  "dyani": "c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f",
  "DYANI": "c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f",
  "D'YANI": "c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f",
  
  "Elevatetoday": "c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f", // Temporarily map to Lord Tokumbo
  "ELEVATETODAY": "c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f",
  "elevatetoday": "c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f",
  
  "AKVR": "c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f", // Temporarily map to Lord Tokumbo
  "akvr": "c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f",
  // Add other artists as needed
};

export const getCreatorIdFromArtistName = (artistName: string): string | null => {
  const normalizedName = artistName.toLowerCase().replace(/[''\s]/g, '');
  const creatorId = artistToCreatorMapping[artistName] || 
                   artistToCreatorMapping[artistName.toLowerCase()] ||
                   artistToCreatorMapping[normalizedName];
  return creatorId || null;
};