<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Include PHPMailer files
require 'PHPMailer.php';
require 'SMTP.php';
require 'Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Retrieve email details from POST data
$recipient = $_POST['recipient'] ?? '';
$subject = $_POST['subject'] ?? '';
$body = $_POST['body'] ?? '';
$filename = $_POST['filename'] ?? 'certificate.pdf';

// Check if attachment is present and valid
$attachment = null;
if (isset($_POST['attachment']) && !empty($_POST['attachment'])) {
    $attachment = base64_decode($_POST['attachment']);
}

// Validate required fields
if (empty($recipient) || empty($subject) || empty($body)) {
    echo json_encode([
        "status" => "error", 
        "message" => "Required parameters are missing."
    ]);
    exit;
}

// Create PHPMailer instance
$mail = new PHPMailer(true);

try {
    // SMTP configuration
    $mail->isSMTP();
    $mail->Host = "smtp.gmail.com";
    $mail->SMTPAuth = true;
    $mail->SMTPSecure = "tls";
    $mail->Port = 587;
    
    // Gmail credentials (use app password)
    $mail->Username = "researchfunding16@gmail.com";
    $mail->Password = "jhyuortrhmyxpxcc"; // App password

    // Email configuration
    $mail->setFrom("researchfunding16@gmail.com", "Conference Management");
    $mail->addAddress($recipient);
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = $body;

    // Add attachment if present
    if ($attachment !== null) {
        $mail->addStringAttachment($attachment, $filename, 'base64', 'application/pdf');
    }

    // Send email
    if ($mail->send()) {
        echo json_encode([
            "status" => "success", 
            "message" => "Email sent successfully to $recipient"
        ]);
    } else {
        throw new Exception("Email could not be sent");
    }
} catch (Exception $e) {
    echo json_encode([
        "status" => "error", 
        "message" => "Email sending failed: " . $mail->ErrorInfo
    ]);
}
?>