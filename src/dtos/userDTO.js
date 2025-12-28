// Object Literal Pattern
module.exports = {
  createUserInputDTO(data) {
    return {
      firstname: data.firstname?.trim(),
      lastname: data.lastname?.trim(),
      email: data.email?.trim().toLowerCase(),
      password: data.password, // NOTE service layer will hash
      restaurantId: data.restaurantId || null,
    };
  },

  updateUserInputDTO(data) {
    const dto = {};
    if (data.firstname !== undefined) dto.firstname = data.firstname.trim();
    if (data.lastname !== undefined) dto.lastname = data.lastname.trim();
    if (data.email !== undefined) dto.email = data.email.trim().toLowerCase();
    if (data.password !== undefined) dto.password = data.password;
    // role is immutable, ignore if sent
    // restaurantId is immutable once assigned
    return dto;
  },

  userOutputDTO(user) {
    return {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
    };
  },
};
