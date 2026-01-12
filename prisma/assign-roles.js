const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * Script to assign admin role to existing users who don't have any roles
 * Run with: node prisma/assign-roles.js
 */
async function assignRolesToExistingUsers() {
  console.log('🔧 Checking for users without roles...')

  try {
    // Get all users
    const allUsers = await prisma.user.findMany({
      include: {
        roles: true,
      },
    })

    // Filter users without roles
    const usersWithoutRoles = allUsers.filter(user => user.roles.length === 0)

    if (usersWithoutRoles.length === 0) {
      console.log('✅ All users already have roles assigned!')
      return
    }

    console.log(`Found ${usersWithoutRoles.length} user(s) without roles`)

    // Get or create admin role
    let adminRole = await prisma.role.findUnique({
      where: { name: 'admin' },
    })

    if (!adminRole) {
      console.log('Creating admin role...')
      adminRole = await prisma.role.create({
        data: {
          name: 'admin',
          description: 'Administrator with full access to all features',
          isSystem: true,
        },
      })
    }

    // Assign admin role to all users without roles
    for (const user of usersWithoutRoles) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      })
      console.log(`✅ Assigned admin role to: ${user.email}`)
    }

    console.log(`\n🎉 Successfully assigned roles to ${usersWithoutRoles.length} user(s)`)
  } catch (error) {
    console.error('❌ Error assigning roles:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
assignRolesToExistingUsers()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
