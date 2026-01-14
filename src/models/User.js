const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const addressSchema = new mongoose.Schema({
  name: {
    type: String,
    // required: true,
    trim: true,
  },
  contact_no: {
    type: String,
    // required: true,
    trim: true,
  },
  house_no_building: {
    type: String,
    // required: true,
    trim: true,
  },
  street_name: {
    type: String,
    // required: true,
    trim: true,
  },
  road_or_area: {
    type: String,
    // required: true,
    trim: true,
  },
  pincode: {
    type: String,
    // required: true,
    trim: true,
  },
  city: {
    type: String,
    // required: true,
    trim: true,
  },
  state: {
    type: String,
    // required: true,
    trim: true,
  },
  landmark: {
    type: String,
    // required: true,
    trim: true,
  },
  default_status: {
    type: Boolean,
    default: true,
  },
});

const emergencyContactSchema = new mongoose.Schema({
  first_name: {
    type: String,
    // required: true,
    trim: true,
  },
  last_name: {
    type: String,
    // required: true,
    trim: true,
  },
  profile_pic: {
    type: String,
    default: "",
  },
  public_id: {
    type: String,
    default: "",
  },
  relation: {
    type: String,
    // required: true,
    trim: true,
  },
  phone_number: {
    type: String,
    // required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
  },
});

const vehicleSchema = new mongoose.Schema({
  vehicle_id: {
    type: String,
    required: true,
  },

  api_data: mongoose.Schema.Types.Mixed,

  vehicle_doc: {
    security_code: {
      type: String,
      default: "",
    },

    documents: [
      {
        doc_name: { type: String, required: true },
        doc_type: {
          type: String,
          enum: [
            "aadhar",
            "pollution",
            "insurance",
            "rc",
            "pancard",
            "driving licence",
            "other",
          ],
          required: true,
        },
        doc_number: { type: String, required: true },
        doc_url: { type: String, required: true },
        public_id: { type: String, default: "" },
      },
    ],
  },
});

const garageSchema = new mongoose.Schema({
  vehicles: [vehicleSchema],
});

const userMyOrderSchema = new mongoose.Schema(
  {
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }, // Reference to main Order schema
    order_data: mongoose.Schema.Types.Mixed, // Stores full order object
  },
  { timestamps: true }
);

const notificationSchema = new mongoose.Schema(
  {
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // ✅ guest case
    },

    sender_pic: {
      type: String,
      default: "",
    },

    name: {
      type: String,
      trim: true,
    },

    time: {
      type: Date,
      default: Date.now,
    },

    notification_type: {
      type: String,
      required: true,
      trim: true,
    },

    notification_title: {
      type: String,
      trim: true,
    },

    link: {
      type: String,
      default: "",
    },

    vehicle_id: {
      type: String,
      ref: "Vehicle",
      default: null,
    },

    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    message: {
      type: String,
      default: "",
    },

    issue_type: {
      type: String,
      default: "",
    },

    chat_room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },

    latitude: {
      type: String,
      default: "",
    },

    longitude: {
      type: String,
      default: "",
    },

    incident_proof: [
      {
        type: String, // Cloudinary URL / file path
      },
    ],

    inapp_notification: {
      type: Boolean,
      default: true,
    },

    seen_status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

const userSchema = new mongoose.Schema({
  basic_details: {
    profile_pic: { type: String, default: "" },
    public_id: { type: String, default: "" },
    first_name: { type: String, trim: true },
    last_name: { type: String, trim: true },
    phone_number: { type: String, trim: true, unique: true },
    phone_number_verified: { type: Boolean, default: false },
    is_phone_number_primary: { type: Boolean, default: false },
    email: { type: String, trim: true, unique: true, lowercase: true },
    is_email_verified: { type: Boolean, default: false },
    is_email_primary: { type: Boolean, default: false },
    password: { type: String },
    occupation: { type: String, default: "" },
    profile_completion_percent: { type: Number, default: 0, min: 0, max: 100 },
  },
  public_details: {
    public_pic: { type: String, default: "" },
    public_id: { type: String, default: "" },
    nick_name: { type: String, default: "" },
    address: { type: String, default: "" },
    age: { type: String, default: "" },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },
  },
  old_passwords: {
    previous_password1: { type: String, default: "" },
    previous_password2: { type: String, default: "" },
    previous_password3: { type: String, default: "" },
  },
  is_tracking_on: { type: Boolean, default: false },

  is_notification_sound_on: {
    type: Boolean,
    default: true,
  },
  notifications: [notificationSchema],
  my_orders: [userMyOrderSchema],
  address_book: [addressSchema],
  qr_list: [
    {
      qr_id: {
        type: String,
        required: true,
        trim: true,
      },
      qr_img: {
        type: String,
        required: true,
        trim: true,
      },
      product_type: {
        type: String,
        enum: ["vehicle", "pets", "children", "devices"],
        default: "vehicle",
      },
      vehicle_id: {
        type: String,
        default: "",
        trim: true,
      },
      assigned_date: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  chat_box: [
    {
      roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
        required: true,
      },

      type: {
        type: String,
        enum: ["direct", "group"],
        required: true,
      },

      lastMessage: {
        type: String,
        default: "",
      },

      // 🔥 Full members object (same as Room.members)
      members: [
        {
          user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          first_name: { type: String, default: "" },
          last_name: { type: String, default: "" },
          profile_pic_url: { type: String, default: "" },
          role: { type: String, default: "user" }, // same as room
        },
      ],
    },
  ],
  emergency_contacts: [emergencyContactSchema],
  garage: garageSchema,
  is_active: { type: Boolean, default: true },
  is_logged_in: { type: Boolean, default: false },
  suspended_until: { type: Date, default: null },
  suspension_reason: { type: String, default: "" },
  account_status: {
    type: String,
    enum: ["ACTIVE", "PENDING_DELETION", "DELETED", "SUSPENDED"],
    default: "ACTIVE",
    index: true,
  },
  deletion_date: { type: Date, default: null, index: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("basic_details.password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.basic_details.password = await bcrypt.hash(
      this.basic_details.password,
      salt
    );
    next();
  } catch (error) {
    next(error);
  }
});

// Update updated_at field before saving
userSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.basic_details.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
  const jwt = require("jsonwebtoken");
  return jwt.sign(
    {
      userId: this._id,
      email: this.basic_details.email,
      phone: this.basic_details.phone_number,
    },
    process.env.JWT_SECRET || "your-secret-key"
  );
};

// Check if user is suspended
userSchema.methods.isSuspended = function () {
  if (!this.suspended_until) {
    return false;
  }
  return new Date() < this.suspended_until;
};

// Get suspension status
userSchema.methods.getSuspensionStatus = function () {
  if (!this.suspended_until) {
    return {
      isSuspended: false,
      suspendedUntil: null,
      reason: null,
    };
  }

  const isSuspended = new Date() < this.suspended_until;
  return {
    isSuspended,
    suspendedUntil: this.suspended_until,
    reason: this.suspension_reason,
  };
};

// Check if user is pending deletion
userSchema.methods.isPendingDeletion = function () {
  return this.account_status === "PENDING_DELETION";
};

// Static method to find user by email or phone
userSchema.statics.findByEmailOrPhone = function (identifier) {
  return this.findOne({
    $or: [
      { "basic_details.email": identifier },
      { "basic_details.phone_number": identifier },
    ],
  });
};

// Static method to find users pending deletion
userSchema.statics.findPendingDeletions = function (date) {
  return this.find({
    account_status: "PENDING_DELETION",
    deletion_date: { $lte: date },
  });
};

module.exports = mongoose.model("User", userSchema);
