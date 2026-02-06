import { HttpResponse } from "msw";

import { db } from "../db";
import { gql } from "./utils";

export const userHandlers = [
  gql.query("CurrentActor", () => {
    return HttpResponse.json({
      data: {
        currentActor: db.users[0],
      },
    });
  }),
];
