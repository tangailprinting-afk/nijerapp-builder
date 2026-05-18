import { NextResponse }
from "next/server";

export async function GET(){

  try{

    const response =
      await fetch(

`https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/artifacts`,

        {

          headers:{

            Authorization:
`Bearer ${process.env.GITHUB_TOKEN}`,

            Accept:
"application/vnd.github+json"

          },

          cache:"no-store"

        }

      );

    const data =
      await response.json();

    const artifact =
      data.artifacts?.[0];

    if(!artifact){

      return NextResponse.json({

        success:false

      });

    }

    return NextResponse.json({

      success:true,

      url:artifact.archive_download_url

    });

  }catch(error){

    return NextResponse.json({

      success:false,

      error:String(error)

    });

  }

}