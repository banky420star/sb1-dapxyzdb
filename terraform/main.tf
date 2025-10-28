# Oracle Cloud Infrastructure Terraform Configuration
# AI Trading System Deployment

terraform {
  required_version = ">= 1.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
}

# Configure the Oracle Cloud Infrastructure Provider
provider "oci" {
  tenancy_ocid         = var.tenancy_ocid
  user_ocid            = var.user_ocid
  fingerprint          = var.fingerprint
  private_key_path     = var.private_key_path
  region               = var.region
  disable_auto_retries = true
}

# Data sources
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_ocid
}

data "oci_core_images" "oracle_linux" {
  compartment_id   = var.compartment_ocid
  operating_system = "Oracle Linux"
  operating_system_version = "8"
  shape            = "VM.Standard.E2.1.Micro"
  sort_by          = "TIMECREATED"
  sort_order       = "DESC"
}

# Variables
variable "tenancy_ocid" {
  description = "The OCID of the tenancy"
  type        = string
}

variable "user_ocid" {
  description = "The OCID of the user"
  type        = string
}

variable "fingerprint" {
  description = "The fingerprint of the API key"
  type        = string
}

variable "private_key_path" {
  description = "The path to the private key file"
  type        = string
}

variable "region" {
  description = "The region to deploy resources"
  type        = string
  default     = "us-ashburn-1"
}

variable "compartment_ocid" {
  description = "The OCID of the compartment"
  type        = string
}

variable "ssh_public_key" {
  description = "The public SSH key for instance access"
  type        = string
}

variable "db_password" {
  description = "The password for the database"
  type        = string
  sensitive   = true
}

# Create VCN
resource "oci_core_vcn" "trading_vcn" {
  compartment_id = var.compartment_ocid
  cidr_block     = "10.0.0.0/16"
  display_name   = "ai-trading-vcn"
  dns_label      = "trading"
}

# Create Internet Gateway
resource "oci_core_internet_gateway" "trading_igw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.trading_vcn.id
  display_name   = "ai-trading-igw"
}

# Create Route Table
resource "oci_core_route_table" "trading_rt" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.trading_vcn.id
  display_name   = "ai-trading-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.trading_igw.id
  }
}

# Create Public Subnet
resource "oci_core_subnet" "public_subnet" {
  compartment_id      = var.compartment_ocid
  vcn_id              = oci_core_vcn.trading_vcn.id
  cidr_block          = "10.0.1.0/24"
  display_name        = "ai-trading-public-subnet"
  dns_label           = "public"
  route_table_id      = oci_core_route_table.trading_rt.id
  security_list_ids   = [oci_core_security_list.public_security_list.id]
}

# Create Private Subnet
resource "oci_core_subnet" "private_subnet" {
  compartment_id      = var.compartment_ocid
  vcn_id              = oci_core_vcn.trading_vcn.id
  cidr_block          = "10.0.2.0/24"
  display_name        = "ai-trading-private-subnet"
  dns_label           = "private"
  prohibit_public_ip_on_vnic = true
  security_list_ids   = [oci_core_security_list.private_security_list.id]
}

# Security Lists
resource "oci_core_security_list" "public_security_list" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.trading_vcn.id
  display_name   = "ai-trading-public-sl"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 22
      max = 22
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 80
      max = 80
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 443
      max = 443
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "10.0.0.0/16"
    tcp_options {
      min = 1
      max = 65535
    }
  }
}

resource "oci_core_security_list" "private_security_list" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.trading_vcn.id
  display_name   = "ai-trading-private-sl"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  ingress_security_rules {
    protocol = "6"
    source   = "10.0.0.0/16"
    tcp_options {
      min = 1
      max = 65535
    }
  }
}

# Create Load Balancer
resource "oci_core_load_balancer" "trading_lb" {
  compartment_id = var.compartment_ocid
  display_name   = "ai-trading-lb"
  shape          = "flexible"
  shape_details {
    minimum_bandwidth_in_mbps = 10
    maximum_bandwidth_in_mbps = 100
  }
  subnet_ids = [oci_core_subnet.public_subnet.id]
}

# Load Balancer Backend Sets
resource "oci_core_load_balancer_backend_set" "frontend_backend_set" {
  load_balancer_id = oci_core_load_balancer.trading_lb.id
  name             = "frontend-backend"
  policy           = "ROUND_ROBIN"
  health_checker {
    protocol          = "HTTP"
    port              = 3000
    url_path          = "/health"
    interval_ms       = 10000
    timeout_in_millis = 3000
    retries           = 3
  }
}

resource "oci_core_load_balancer_backend_set" "api_backend_set" {
  load_balancer_id = oci_core_load_balancer.trading_lb.id
  name             = "api-backend"
  policy           = "ROUND_ROBIN"
  health_checker {
    protocol          = "HTTP"
    port              = 8000
    url_path          = "/api/health"
    interval_ms       = 10000
    timeout_in_millis = 3000
    retries           = 3
  }
}

# Load Balancer Listeners
resource "oci_core_load_balancer_listener" "frontend_listener" {
  load_balancer_id         = oci_core_load_balancer.trading_lb.id
  name                     = "frontend-listener"
  default_backend_set_name = oci_core_load_balancer_backend_set.frontend_backend_set.name
  port                     = 80
  protocol                 = "HTTP"
}

resource "oci_core_load_balancer_listener" "api_listener" {
  load_balancer_id         = oci_core_load_balancer.trading_lb.id
  name                     = "api-listener"
  default_backend_set_name = oci_core_load_balancer_backend_set.api_backend_set.name
  port                     = 8000
  protocol                 = "HTTP"
}

# Create Compute Instances
resource "oci_core_instance" "frontend_instance" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_ocid
  display_name        = "ai-trading-frontend"
  shape               = "VM.Standard.E2.1.Micro"

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.oracle_linux.images[0].id
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public_subnet.id
    assign_public_ip = true
    hostname_label   = "frontend"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data = base64encode(file("${path.module}/scripts/frontend-setup.sh"))
  }

  agent_config {
    plugins_config {
      desired_state = "ENABLED"
      name          = "Vulnerability Scanning"
    }
    plugins_config {
      desired_state = "ENABLED"
      name          = "OS Management Service Agent"
    }
    plugins_config {
      desired_state = "ENABLED"
      name          = "Compute Instance Monitoring"
    }
  }
}

resource "oci_core_instance" "backend_instance" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_ocid
  display_name        = "ai-trading-backend"
  shape               = "VM.Standard.E2.1.Micro"

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.oracle_linux.images[0].id
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.private_subnet.id
    assign_public_ip = false
    hostname_label   = "backend"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data = base64encode(file("${path.module}/scripts/backend-setup.sh"))
  }
}

resource "oci_core_instance" "ml_instance" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_ocid
  display_name        = "ai-trading-ml"
  shape               = "VM.Standard.E2.1.Micro"

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.oracle_linux.images[0].id
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.private_subnet.id
    assign_public_ip = false
    hostname_label   = "ml-service"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data = base64encode(file("${path.module}/scripts/ml-setup.sh"))
  }
}

resource "oci_core_instance" "db_instance" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_ocid
  display_name        = "ai-trading-db"
  shape               = "VM.Standard.E2.1.Micro"

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.oracle_linux.images[0].id
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.private_subnet.id
    assign_public_ip = false
    hostname_label   = "database"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data = base64encode(templatefile("${path.module}/scripts/db-setup.sh", {
      db_password = var.db_password
    }))
  }
}

# Load Balancer Backends
resource "oci_core_load_balancer_backend" "frontend_backend" {
  load_balancer_id = oci_core_load_balancer.trading_lb.id
  backendset_name  = oci_core_load_balancer_backend_set.frontend_backend_set.name
  ip_address       = oci_core_instance.frontend_instance.private_ip
  port             = 3000
  backup           = false
  drain            = false
  offline          = false
  weight           = 1
}

resource "oci_core_load_balancer_backend" "api_backend" {
  load_balancer_id = oci_core_load_balancer.trading_lb.id
  backendset_name  = oci_core_load_balancer_backend_set.api_backend_set.name
  ip_address       = oci_core_instance.backend_instance.private_ip
  port             = 8000
  backup           = false
  drain            = false
  offline          = false
  weight           = 1
}

# Outputs
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