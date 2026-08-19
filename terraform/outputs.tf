output "server_public_ip" {
  description = "Static Elastic Public IP address for the Cerebra server"
  value       = aws_eip.cerebra_eip.public_ip
}

output "api_endpoint" {
  description = "FastAPI Backend API endpoint"
  value       = "http://${aws_eip.cerebra_eip.public_ip}:8000"
}

output "api_docs_swagger" {
  description = "Interactive Swagger API documentation URL"
  value       = "http://${aws_eip.cerebra_eip.public_ip}:8000/docs"
}

output "frontend_app_url" {
  description = "Cerebra Web Frontend Application URL"
  value       = "http://${aws_eip.cerebra_eip.public_ip}"
}

output "ssh_connection_command" {
  description = "SSH Command to connect to the EC2 server"
  value       = "ssh -i <your-key.pem> ubuntu@${aws_eip.cerebra_eip.public_ip}"
}
