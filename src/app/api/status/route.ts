import { NextResponse }
from "next/server";

import {
  getWorkflowStatus
} from "../../../lib/github";

export async function GET(
  req:Request
){

  try{

    const {
      searchParams
    } = new URL(req.url);

    const runId =
      searchParams.get(
        "runId"
      );

    if(!runId){

      return NextResponse.json({

        success:false,

        error:"No Run ID"

      });

    }

    const data =
      await getWorkflowStatus(
        runId
      );

    return NextResponse.json({

      success:true,

      status:data.status,

      conclusion:
        data.conclusion

    });

  }catch(error){

    return NextResponse.json({

      success:false,

      error:String(error)

    });

  }

}