export const generateFirstLoginEmail = (
    userName: string,
    userEmail: string,
    userPassword: string,
    companyName: string
): string => {
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome - First Time Login</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
    </head>
    <body>
    </body>
  </html>`;
};