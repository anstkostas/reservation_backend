// Object Literal Pattern
module.exports = {
  createUserInputDTO(data) {
    return {
      firstName: data.firstName?.trim(),
      lastName: data.lastName?.trim(),
      email: data.email?.trim().toLowerCase(),
      password: data.password, // NOTE service layer will hash
      restaurantId: data.restaurantId || null,
    };
  },

  updateUserInputDTO(data) {
    const dto = {};
    if (data.firstName !== undefined) dto.firstName = data.firstName.trim();
    if (data.lastName !== undefined) dto.lastName = data.lastName.trim();
    if (data.email !== undefined) dto.email = data.email.trim().toLowerCase();
    if (data.password !== undefined) dto.password = data.password;
    // role is immutable, ignore if sent
    // restaurantId is immutable once assigned
    return dto;
  },

  userOutputDTO(user) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
  },
};
