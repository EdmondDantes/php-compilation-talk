#define _GNU_SOURCE
#include <stdio.h>
#include <stddef.h>
#include <php.h>
int main(void) {
 printf("PHP=%s pointer=%zu zval=%zu zend_object=%zu object_properties_offset=%zu zend_array=%zu Bucket=%zu\n",PHP_VERSION,sizeof(void*),sizeof(zval),sizeof(zend_object),offsetof(zend_object,properties_table),sizeof(zend_array),sizeof(Bucket));
 return 0;
}
