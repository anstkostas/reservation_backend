"use strict";

const { v4: uuidv4 } = require('uuid');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get owner users (role = owner)
    const owners = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE role = 'owner'`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    await queryInterface.bulkInsert("Restaurants", [
      {
        id: uuidv4(),
        name: "Ocean View Taverna",
        description: "Fresh seafood with a beautiful sea view.",
        capacity: 25,
        address: "123 Seaside Blvd",
        phone: "555-0101",
        logoUrl: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?q=80&w=200&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        coverImageUrl: "https://images.unsplash.com/photo-1698676972614-9cf3e93b7f77?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        ownerId: owners[0]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "Mountain Grill",
        description: "Traditional grill house in the mountains.",
        capacity: 40,
        address: "456 Highland Dr",
        phone: "555-0102",
        logoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=200&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=1200&auto=format&fit=crop",
        ownerId: owners[1]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "Urban Bistro",
        description: "Modern cuisine in the city center.",
        capacity: 10,
        address: "789 Downtown Ave",
        phone: "555-0103",
        logoUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=200&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1200&auto=format&fit=crop",
        ownerId: owners[2]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "Garden Café",
        description: "Cozy café with outdoor seating in a lush garden.",
        capacity: 40,
        address: "321 Park Lane",
        phone: "555-0104",
        logoUrl: "https://images.unsplash.com/photo-1505253304499-671c55fb57fe?q=80&w=200&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop",
        ownerId: owners[3]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "Sunset Deli",
        description: "Casual deli with sandwiches and fresh salads.",
        capacity: 15,
        address: "654 Beach Rd",
        phone: "555-0105",
        logoUrl: "https://images.unsplash.com/photo-1554433607-66b5efe9d304?q=80&w=200&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1601606903106-8cee0dc66cdc?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        ownerId: owners[4]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "The Steakhouse",
        description: "Premium steaks grilled to perfection.",
        capacity: 30,
        address: "987 Meatpacker St",
        phone: "555-0106",
        logoUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=200&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=1200&auto=format&fit=crop",
        ownerId: owners[5]?.id ?? null,
      },
      {
        id: uuidv4(),
        name: "Pasta Palace",
        description: "Homemade pasta and Italian classics.",
        capacity: 70,
        address: "147 Little Italy Way",
        phone: "555-0107",
        logoUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?q=80&w=200&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=1200&auto=format&fit=crop",
        ownerId: null,
      },
      {
        id: uuidv4(),
        name: "Sushi Corner",
        description: "Fresh sushi and Japanese delicacies.",
        capacity: 20,
        address: "258 Tokyo St",
        phone: "555-0108",
        logoUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=200&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1568018508399-e53bc8babdde?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        ownerId: null,
      },
      {
        id: uuidv4(),
        name: "Vegan Delight",
        description: "100% plant-based menu with healthy options.",
        capacity: 50,
        address: "369 Green St",
        phone: "555-0109",
        logoUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1540914124281-342587941389?q=80&w=1200&auto=format&fit=crop",
        ownerId: null,
      },
      {
        id: uuidv4(),
        name: "Mediterraneo",
        description: "Mediterranean cuisine with fresh ingredients.",
        capacity: 80,
        address: "159 Olive Grove",
        phone: "555-0110",
        logoUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=200&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=1200&auto=format&fit=crop",
        ownerId: null,
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
