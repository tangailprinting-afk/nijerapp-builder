import "./globals.css";

export const metadata = {

  title:"NijerApp Builder",

  description:
    "HTML To APK Builder"

};

export default function RootLayout({

  children,

}: Readonly<{

  children: React.ReactNode;

}>){

  return(

    <html lang="en">

      <body>

        {children}

      </body>

    </html>

  );

}