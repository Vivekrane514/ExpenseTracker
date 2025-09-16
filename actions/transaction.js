"use server"

import aj from "@/lib/arcjet";
import { db } from "@/lib/prisma";
import { request } from "@arcjet/next";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";
import { checkUser } from "@/lib/checkUser";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
});

// Category mapping for fallback if AI returns names instead of IDs
const categoryMapping = {
  "Housing": "housing",
  "Transportation": "transportation",
  "Groceries": "groceries",
  "Utilities": "utilities",
  "Entertainment": "entertainment",
  "Food": "food",
  "Shopping": "shopping",
  "Healthcare": "healthcare",
  "Education": "education",
  "Personal Care": "personal",
  "Travel": "travel",
  "Insurance": "insurance",
  "Gifts & Donations": "gifts",
  "Bills & Fees": "bills",
  "Other Expenses": "other-expense",
  // Lowercase versions
  "housing": "housing",
  "transportation": "transportation",
  "groceries": "groceries",
  "utilities": "utilities",
  "entertainment": "entertainment",
  "food": "food",
  "shopping": "shopping",
  "healthcare": "healthcare",
  "education": "education",
  "personal": "personal",
  "travel": "travel",
  "insurance": "insurance",
  "gifts": "gifts",
  "bills": "bills",
  "other-expense": "other-expense",
};

export async function createTransaction(data) {
try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Get request data for ArcJet
    const req = await request();

    // Check rate limit
    const decision = await aj.protect(req, {
      userId,
      requested: 1, // Specify how many tokens to consume
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });

        throw new Error("Too many requests. Please try again later.");
      }

      throw new Error("Request blocked");
    }

    const user = await checkUser();

    if (!user) {
      throw new Error("User not found");
    }

     const account = await db.account.findUnique({
      where: {
        id: data.accountId,
        userId: user.id,
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    // Calculate new balance
    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance.toNumber() + balanceChange;

     // Create transaction and update account balance
    const transaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          userId: user.id,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
       });

       await tx.account.update({
        where: { id: data.accountId },
        data:  { balance: newBalance},
        });

        return newTransaction;
      });

      revalidatePath("/dashboard");
      revalidatePath(`/account/${transaction.accountId}`);

      return { success: true, data: serializeAmount(transaction) };
} catch (error) {
    throw new Error(error.message);
}
}

// Helper function to calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
}

export async function scanReceipt(file) {
    try {
         const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    // Convert ArrayBuffer to Base64
    const base64String = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `
      Analyze this receipt image and extract the following information in JSON format:
      - Total amount (just the number, e.g., 25.99)
      - Date (in ISO format, e.g., "2023-10-15T00:00:00.000Z")
      - Description or items purchased (brief summary, e.g., "Coffee and pastry")
      - Merchant/store name (e.g., "Starbucks")
      - Suggested category (choose the most appropriate from: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense)
        - housing: rent, mortgage, home repairs
        - transportation: gas, car maintenance, public transit
        - groceries: supermarket, food store
        - utilities: electricity, water, internet
        - entertainment: movies, games, concerts
        - food: restaurants, fast food
        - shopping: clothing, electronics
        - healthcare: medical, pharmacy
        - education: books, courses
        - personal: haircuts, gym
        - travel: flights, hotels
        - insurance: health, car insurance
        - gifts: presents, donations
        - bills: bank fees, service charges
        - other-expense: anything else

      Only respond with valid JSON in this exact format:
      {
        "amount": number,
        "date": "ISO date string",
        "description": "string",
        "merchantName": "string",
        "category": "string"
      }

      If it's not a receipt or information is unclear, return an empty object {}
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    console.log(cleanedText);

    try {
      const data = JSON.parse(cleanedText);
      // Map category to ID if it's a name
      const mappedCategory = categoryMapping[data.category] || data.category;
      return {
        amount: parseFloat(data.amount),
        date: new Date(data.date),
        description: data.description,
        category: mappedCategory,
        merchantName: data.merchantName,
      };
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      throw new Error("Invalid response format from Gemini");
    }
  } catch (error) {
    console.error("Error scanning receipt:", error.message);
    throw new Error("Failed to scan receipt");
  }
}


export async function getTransaction(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const transaction = await db.transaction.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!transaction) throw new Error("Transaction not found");

  return serializeAmount(transaction);
}

export async function updateTransaction(id, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Get original transaction to calculate balance change
    const originalTransaction = await db.transaction.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        account: true,
      },
    });

    if (!originalTransaction) throw new Error("Transaction not found");

    // Calculate balance changes
    const oldBalanceChange =
      originalTransaction.type === "EXPENSE"
        ? -originalTransaction.amount.toNumber()
        : originalTransaction.amount.toNumber();

    const newBalanceChange =
      data.type === "EXPENSE" ? -data.amount : data.amount;

    const netBalanceChange = newBalanceChange - oldBalanceChange;

    // Update transaction and account balance in a transaction
    const transaction = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // Update account balance
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: netBalanceChange,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}