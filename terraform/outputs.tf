# Terraform Outputs for Oracle Cloud Infrastructure

output "load_balancer_ip" {
  description = "The public IP of the load balancer"
  value       = oci_core_load_balancer.trading_lb.ip_addresses[0].ip_address
}

output "frontend_public_ip" {
  description = "The public IP of the frontend instance"
  value       = oci_core_instance.frontend_instance.public_ip
}

output "backend_private_ip" {
  description = "The private IP of the backend instance"
  value       = oci_core_instance.backend_instance.private_ip
}

output "ml_private_ip" {
  description = "The private IP of the ML service instance"
  value       = oci_core_instance.ml_instance.private_ip
}

output "db_private_ip" {
  description = "The private IP of the database instance"
  value       = oci_core_instance.db_instance.private_ip
}

output "vcn_id" {
  description = "The OCID of the VCN"
  value       = oci_core_vcn.trading_vcn.id
}

output "public_subnet_id" {
  description = "The OCID of the public subnet"
  value       = oci_core_subnet.public_subnet.id
}

output "private_subnet_id" {
  description = "The OCID of the private subnet"
  value       = oci_core_subnet.private_subnet.id
}

output "frontend_url" {
  description = "The URL to access the frontend application"
  value       = "http://${oci_core_load_balancer.trading_lb.ip_addresses[0].ip_address}"
}

output "api_url" {
  description = "The URL to access the API"
  value       = "http://${oci_core_load_balancer.trading_lb.ip_addresses[0].ip_address}:8000"
}

output "ssh_commands" {
  description = "SSH commands to connect to instances"
  value = {
    frontend = "ssh opc@${oci_core_instance.frontend_instance.public_ip}"
    backend  = "ssh opc@${oci_core_instance.backend_instance.private_ip} (via bastion)"
    ml       = "ssh opc@${oci_core_instance.ml_instance.private_ip} (via bastion)"
    database = "ssh opc@${oci_core_instance.db_instance.private_ip} (via bastion)"
  }
}

output "deployment_summary" {
  description = "Summary of the deployment"
  value = {
    frontend_url    = "http://${oci_core_load_balancer.trading_lb.ip_addresses[0].ip_address}"
    api_url         = "http://${oci_core_load_balancer.trading_lb.ip_addresses[0].ip_address}:8000"
    load_balancer_ip = oci_core_load_balancer.trading_lb.ip_addresses[0].ip_address
    instances = {
      frontend = {
        public_ip  = oci_core_instance.frontend_instance.public_ip
        private_ip = oci_core_instance.frontend_instance.private_ip
      }
      backend = {
        private_ip = oci_core_instance.backend_instance.private_ip
      }
      ml_service = {
        private_ip = oci_core_instance.ml_instance.private_ip
      }
      database = {
        private_ip = oci_core_instance.db_instance.private_ip
      }
    }
  }
}