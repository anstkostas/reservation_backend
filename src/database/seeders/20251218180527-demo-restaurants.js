"use strict";

const { v4: uuidv4 } = require('uuid');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get owner users (role = owner)
    const owners = await queryInterface.sequelize.query(
      `SELECT id FROM Users WHERE role = 'owner'`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    await queryInterface.bulkInsert("Restaurants", [
      {
        id: uuidv4(),
        name: "Ocean View Taverna",
        description: "Fresh seafood with a beautiful sea view.",
        capacity: 25,
        logoUrl: "/images/restaurants/ocean-logo.png",
        coverImageUrl: "/images/restaurants/ocean-cover.jpg",
        ownerId: owners[0]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "Mountain Grill",
        description: "Traditional grill house in the mountains.",
        capacity: 40,
        logoUrl: "/images/restaurants/mountain-logo.png",
        coverImageUrl: "/images/restaurants/mountain-cover.jpg",
        ownerId: owners[0]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "Urban Bistro",
        description: "Modern cuisine in the city center.",
        capacity: 10,
        logoUrl: "/images/restaurants/urban-logo.png",
        coverImageUrl: "/images/restaurants/urban-cover.jpg",
        ownerId: owners[0]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "Garden Café",
        description: "Cozy café with outdoor seating in a lush garden.",
        capacity: 40,
        logoUrl: "/images/restaurants/garden-logo.png",
        coverImageUrl: "/images/restaurants/garden-cover.jpg",
        ownerId: owners[1]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "Sunset Deli",
        description: "Casual deli with sandwiches and fresh salads.",
        capacity: 15,
        logoUrl: "/images/restaurants/sunset-logo.png",
        coverImageUrl: "/images/restaurants/sunset-cover.jpg",
        ownerId: owners[1]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "The Steakhouse",
        description: "Premium steaks grilled to perfection.",
        capacity: 30,
        logoUrl: "/images/restaurants/steakhouse-logo.png",
        coverImageUrl: "/images/restaurants/steakhouse-cover.jpg",
        ownerId: owners[1]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "Pasta Palace",
        description: "Homemade pasta and Italian classics.",
        capacity: 70,
        logoUrl: "/images/restaurants/pasta-logo.png",
        coverImageUrl: "/images/restaurants/pasta-cover.jpg",
        ownerId: owners[2]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "Sushi Corner",
        description: "Fresh sushi and Japanese delicacies.",
        capacity: 20,
        logoUrl: "/images/restaurants/sushi-logo.png",
        coverImageUrl: "/images/restaurants/sushi-cover.jpg",
        ownerId: owners[3]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "Vegan Delight",
        description: "100% plant-based menu with healthy options.",
        capacity: 50,
        logoUrl: "/images/restaurants/vegan-logo.png",
        coverImageUrl: "/images/restaurants/vegan-cover.jpg",
        ownerId: owners[4]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "Mediterraneo",
        description: "Mediterranean cuisine with fresh ingredients.",
        capacity: 80,
        logoUrl: "/images/restaurants/mediterraneo-logo.png",
        coverImageUrl: "/images/restaurants/mediterraneo-cover.jpg",
        ownerId: owners[5]?.id ?? null,
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Restaurants", {
      name: [
        "Ocean View Taverna",
        "Mountain Grill",
        "Urban Bistro",
        "Garden Café",
        "Sunset Deli",
        "The Steakhouse",
        "Pasta Palace",
        "Sushi Corner",
        "Vegan Delight",
        "Mediterraneo",
      ],
    });
  },
};
