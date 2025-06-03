<?php
session_start(); 
// CORS Headers
header("Access-Control-Allow-Origin: *"); // Allow any origin; replace * with specific origin if needed
header("Access-Control-Allow-Methods: POST, OPTIONS"); // Only allow POST and OPTIONS methods
header("Access-Control-Allow-Headers: Content-Type");

// Retrieve email details from POST data
$recipient = isset($_POST['recipient']) ? $_POST['recipient'] : '';
$subject = isset($_POST['subject']) ? $_POST['subject'] : '';
$body = isset($_POST['body']) ? $_POST['body'] : '';

// Validate required fields
if (empty($recipient) || empty($subject) || empty($body)) {
    echo json_encode(["status" => "error", "message" => "Required parameters are missing."]);
    exit;
}



//Include required PHPMailer files
	require 'PHPMailer.php';
	require 'SMTP.php';
	require 'Exception.php';
//Define name spaces
	use PHPMailer\PHPMailer\PHPMailer;
	use PHPMailer\PHPMailer\SMTP;
	use PHPMailer\PHPMailer\Exception;

	

//Create instance of PHPMailer
	$mail = new PHPMailer();
//Set mailer to use smtp
	$mail->isSMTP();
//Define smtp host
	$mail->Host = "smtp.gmail.com";
//Enable smtp authentication
	$mail->SMTPAuth = true;
//Set smtp encryption type (ssl/tls)
	$mail->SMTPSecure = "tls";
//Port to connect smtp
	$mail->Port = "587";
//Set gmail username
// 	$mail->Username = "researchfunding16@gmail.com";
// //Set gmail password
// 	// $mail->Password = "augzihvfqsdvfpav";
// 	$mail->Password = "lizwcsumhkctowlg";

$mail->Username = "researchfunding16@gmail.com";
//Set gmail password
// Set the Gmail password
$mail->Password = "jhyuortrhmyxpxcc";
//Email subject
	$mail->Subject = $subject;
//Set sender email
	$mail->setFrom($email );
//Enable HTML
	$mail->isHTML(true);
//Attachment
//	$mail->addAttachment('img/attachment.png');
//Email body
	$mail->Body = $body;
//Add recipient
	$mail->addAddress("vgwala149@gmail.com");
//Finally send email
 // Send the email and check if it was successful
 

 if ($mail->send()) {
	echo json_encode(["status" => "success", "message" => "Email sent successfully."]);
} else {
	echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}

// Close the SMTP connection
$mail->smtpClose();

?>