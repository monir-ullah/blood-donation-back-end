import * as bcrypt from "bcrypt";
import prisma from "../../../shared/prisma";
import { IPaginationOptions } from "../../interfaces/pagination";
import { paginationHelper } from "../../../helpars/paginationHelper";
import { Prisma, User, UserStatus } from "@prisma/client";
import { userSearchAbleFields } from "./user.constant";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import { IUserrFilterRequest } from "./user.interface";
import { IGenericResponse } from "../../../interfaces/common";

//Get all users
// const getAllFromDB = async (params: any, options: IPaginationOptions) => {
//   const { page, limit, skip } = paginationHelper.calculatePagination(options);
//   const { searchTerm, ...filterData } = params;

//   const andCondions: Prisma.UserWhereInput[] = [];

//   if (params.searchTerm) {
//     andCondions.push({
//       OR: userSearchAbleFields.map((field) => ({
//         [field]: {
//           contains: params.searchTerm,
//           mode: "insensitive",
//         },
//       })),
//     });
//   }

//   if (Object.keys(filterData).length > 0) {
//     andCondions.push({
//       AND: Object.keys(filterData).map((key) => ({
//         [key]: {
//           equals: (filterData as any)[key],
//         },
//       })),
//     });
//   }

//   andCondions.push({
//     status: UserStatus.ACTIVE,
//   });

//   const whereConditons: Prisma.UserWhereInput =
//     andCondions.length > 0 ? { AND: andCondions } : {};

//   const result = await prisma.user.findMany({
//     where: whereConditons,
//     skip,
//     take: limit,
//     orderBy:
//       options.sortBy && options.sortOrder
//         ? {
//             [options.sortBy]: options.sortOrder,
//           }
//         : {
//             createdAt: "desc",
//           },
//     select: {
//       id: true,
//       name: true,
//       email: true,
//       needPasswordChange: true,
//       bloodType: true,
//       location: true,
//       availability: true,
//       status: true,
//       profilePicture: true,
//       totalDonations: true,
//       city: true,
//       createdAt: true,
//       updatedAt: true,
//       userProfile: {
//         select: {
//           id: true,
//           userId: true,
//           bio: true,
//           age: true,
//           contactNumber: true,
//           lastDonationDate: true,
//           createdAt: true,
//           updatedAt: true,
//         },
//       },
//     },
//   });

//   const total = await prisma.user.count({
//     where: whereConditons,
//   });

//   return {
//     meta: {
//       page,
//       limit,
//       total,
//     },
//     data: result,
//   };
// };

/////////////////////////////////////////////////////

const getAllFromDB = async (
  filters: IUserrFilterRequest,
  options: IPaginationOptions
): Promise<IGenericResponse<User[]>> => {
  const { limit, page, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.UserWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: userSearchAbleFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    const filterConditions = Object.keys(filterData).map((key) => ({
      [key]: {
        equals: (filterData as any)[key],
      },
    }));
    andConditions.push(...filterConditions);
  }

  andConditions.push({
    status: UserStatus.ACTIVE,
  });

  const whereConditions: Prisma.UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.user.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { totalDonations: "desc" },
    include: {
      userProfile: {
        select: {
          id: true,
          userId: true,
          bio: true,
          age: true,
          lastDonationDate: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  const total = await prisma.user.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

////////////////////////////////////////////////////////

//get by id
const getByIdFromDB = async (id: string): Promise<User | null> => {
  // console.log(id);
  const result = await prisma.user.findUnique({
    where: {
      id,
      status: UserStatus.ACTIVE,
    },
    include: {
      userProfile: {
        select: {
          id: true,
          userId: true,
          bio: true,
          age: true,
          lastDonationDate: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
  // console.log(result);
  return result;
};

//Create user
const createUser = async (data: any) => {
  const hashedPassword = await bcrypt.hash(data.password, 12);

  // console.log(data);

  const userData = {
    name: data.name,
    email: data.email,
    password: hashedPassword,
    role: data.role || "USER",
    bloodType: data.bloodType,
    location: data.location,
    city: data.city,
    totalDonations: data.totalDonations,
    availability: data.availability,
    status: data.status,
  };

  const userInfo = await prisma.user.findFirst({
    where: {
      email: data.email,
    },
  });
  // console.log(userInfo);

  if (userInfo) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User already exists");
  }

  const result = prisma.$transaction(async (transactionClient) => {
    const createdUser = await transactionClient.user.create({
      data: userData,
    });

    const createdUserProfile = await transactionClient.userProfile.create({
      data: {
        userId: createdUser.id,
        age: data.age,
        bio: data.bio,
        lastDonationDate: data.lastDonationDate,
      },
    });
    // return createdUserProfile;
    // Fetch user details to include in the response
    const userDetails = await transactionClient.user.findUnique({
      where: {
        id: createdUser.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        bloodType: true,
        location: true,
        availability: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { ...userDetails, userProfile: createdUserProfile };
  });

  return result;
};

//Delete User
const deleteUser = async (id: string) => {
  const userData = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  // console.log("User data = ", userData);

  if (!userData) {
    throw new ApiError(httpStatus.NOT_FOUND, "User is not found");
  }

  const deletedUser = await prisma.user.update({
    where: {
      id,
    },
    data: {
      status: UserStatus.DELETED,
    },
  });

  // console.log("Deleted User:", deletedUser);
  return deletedUser;
};

//partial updating the user
const updateUserByAdmin = async (data: any) => {
  const userId = data.id;

  // console.log(userId);

  // Find the user and include their profile
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User is not found");
  }

  const userData = {
    role: data.role,
    status: data.status,
  };

  const updateUserData = await prisma.user.update({
    where: {
      id: userId,
    },
    data: userData,
  });

  return updateUserData;
};

export const userServices = {
  getAllFromDB,
  getByIdFromDB,
  createUser,
  deleteUser,
  updateUserByAdmin,
};
