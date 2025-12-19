const CreateUserInputDTO = ({
  firstName,
  lastName,
  email,
  password,
  role,
}) => ({
  firstName: firstName.trim(),
  lastName: lastName.trim(),
  email: email.trim().toLowerCase(),
  password, // NOTE service layer will hash
  role,
});

const UpdateUserInputDTO = (data) => {
  const dto = {};
  if (data.firstName !== undefined) dto.firstName = data.firstName.trim();
  if (data.lastName !== undefined) dto.lastName = data.lastName.trim();
  if (data.email !== undefined) dto.email = data.email.trim().toLowerCase();
  if (data.password !== undefined) dto.password = data.password;
  if (data.role !== undefined) dto.role = data.role;
  return dto;
};

const UserOutputDTO = ({ id, firstName, lastName, email, role }) => ({
  id,
  firstName,
  lastName,
  email,
  role,
});

module.exports = {
  CreateUserInputDTO,
  UpdateUserInputDTO,
  UserOutputDTO,
};
