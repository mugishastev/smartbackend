# andasy.hcl app configuration file generated for smartcoophub on Wednesday, 19-Nov-25 15:19:02 SAST
#
# See https://github.com/quarksgroup/andasy-cli for information about how to use this file.

app_name = "smartcoophub"

app {

  env = {}

  port = 5001

  compute {
    cpu      = 1
    memory   = 512
    cpu_kind = "shared"
  }

  process {
    name = "smartcoophub"
  }

}
