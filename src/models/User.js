const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const calculateProfileCompletion = require("../middleware/profileCompletionCalculator");

const addressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    contact_no: {
      type: String,
      trim: true,
      maxlength: 15,
      default: "",
    },

    house_no_building: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    street_name: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    road_or_area: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    pincode: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    landmark: {
      type: String,
      trim: true,
      default: "",
    },

    default_status: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

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

const vehicleDocSchema = new mongoose.Schema(
  {
    security_code: {
      type: String,
      default: "",
      index: true,
    },

    documents: [
      {
        _id: false,

        doc_name: {
          type: String,
          required: true,
          trim: true,
        },

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
          index: true,
        },

        doc_number: {
          type: String,
          required: true,
          trim: true,
        },

        doc_url: {
          type: String,
          required: true,
        },

        public_id: {
          type: String,
          default: "",
        },

        uploaded_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { _id: false },
);

const vehicleSchema = new mongoose.Schema(
  {
    vehicle_id: {
      type: String,
      required: true,
      trim: true,
    },

    vehicle_doc: {
      type: vehicleDocSchema,
      default: () => ({ documents: [] }),
    },

    qr_list: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { _id: false },
);

const garageSchema = new mongoose.Schema({
  vehicles: [vehicleSchema],
});

const userSchema = new mongoose.Schema(
  {
    basic_details: {
      profile_pic: { type: String, default: "" },
      public_id: { type: String, default: "" },
      first_name: { type: String, trim: true },
      last_name: { type: String, trim: true },
      phone_number: { type: String, trim: true },
      phone_number_verified: { type: Boolean, default: false },
      is_phone_number_primary: { type: Boolean, default: false },
      email: { type: String, trim: true, lowercase: true },
      is_email_verified: { type: Boolean, default: false },
      is_email_primary: { type: Boolean, default: false },
      password: { type: String, select: false },
      occupation: { type: String, default: "" },
      profile_completion_percent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
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
    notification_count: {
      type: Number,
      default: 0,
    },
    my_orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    address_book: [addressSchema],
    qr_list: [
      {
        type: String,
        required: true,
      },
    ],

    chat_rooms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
        index: true,
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
    },
    deletion_date: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ "basic_details.email": 1 }, { unique: true });
userSchema.index({ "basic_details.phone_number": 1 }, { unique: true });
userSchema.index({ account_status: 1 });
userSchema.index({ deletion_date: 1 });
userSchema.index({ "garage.vehicles.vehicle_id": 1 });
userSchema.index({ "my_orders.order_id": 1 });
userSchema.index({ "address_book.default_status": 1 });
userSchema.index({ "address_book.city": 1 });
userSchema.index({ "address_book.state": 1 });
userSchema.index({ "address_book.contact_no": 1 });
userSchema.index({ qr_list: 1 });
vehicleSchema.index({ qr_list: 1 });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("basic_details.password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.basic_details.password = await bcrypt.hash(
      this.basic_details.password,
      salt,
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

userSchema.pre("save", function (next) {
  if (
    this.isModified("basic_details") ||
    this.isModified("public_details") ||
    this.isModified("emergency_contacts")
  ) {
    this.basic_details.profile_completion_percent =
      calculateProfileCompletion(this);
  }

  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.basic_details.password);
};

module.exports = mongoose.model("User", userSchema);
