module.exports = {
  restaurantOutputDTO(dbData) {
    return {
      id: dbData.id,
      name: dbData.name,
      description: dbData.description,
      capacity: dbData.capacity,
      logoUrl: dbData.logoUrl,
      coverImageUrl: dbData.coverImageUrl,
      ownerId: dbData.ownerId,
    };
  },
};
