import { customerDetailHandlers } from "./handlers/customer-detail";
import { organizationHandlers } from "./handlers/organization";
import { subscriptionHandlers } from "./handlers/subscription";
import { userHandlers } from "./handlers/user";

export const handlers = [
  ...userHandlers,
  ...organizationHandlers,
  ...subscriptionHandlers,
  ...customerDetailHandlers,
];
