const createRestaurantInputDTO = ({
  name,
  description,
  capacity,
  logoUrl,
  coverImageUrl,
  ownerId,
}) => ({
  name: name.trim(),
  description: description?.trim() || "",
  capacity,
  logoUrl,
  coverImageUrl,
  ownerId,
});

const updateRestaurantInputDTO = (data) => {
  const dto = {};
  if (data.name !== undefined) dto.name = data.name.trim();
  if (data.description !== undefined)
    if (data.capacity !== undefined) dto.capacity = data.capacity;
  dto.description = data.description?.trim();
  if (data.logoUrl !== undefined) dto.logoUrl = data.logoUrl;
  if (data.coverImageUrl !== undefined) dto.coverImageUrl = data.coverImageUrl;
  if (data.ownerId !== undefined) dto.ownerId = data.ownerId;
  return dto;
};

const restaurantOutputDTO = ({
  id,
  name,
  description,
  capacity,
  logoUrl,
  coverImageUrl,
  ownerId,
}) => ({
  id,
  name,
  description,
  capacity,
  logoUrl,
  coverImageUrl,
  ownerId,
});

module.exports = {
  createRestaurantInputDTO,
  updateRestaurantInputDTO,
  restaurantOutputDTO,
};
