'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
    await queryInterface.bulkInsert("Users", [
      {
        id: Sequelize.literal("uuid_generate_v4()"),
        firebase_uid: "demo_firebase_uid",
        email: "demo@thinkmirai.com",
        full_name: "Demo User",
        phone_number: "1234567890",
        profile_pic: "https://example.com/avatar.png",
        signup_date: new Date(),
        last_login: new Date(),
        email_verified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete("Users", null, {});
  }
};
