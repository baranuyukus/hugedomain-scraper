import csv
import random

input_file = "../domains_async.csv"
output_file = "../domains_test.csv"

def generate_dummy():
    print("Generating domains_test.csv...")
    with open(input_file, "r") as fin, open(output_file, "w") as fout:
        reader = csv.reader(fin)
        writer = csv.writer(fout)
        
        header = next(reader)
        writer.writerow(header)
        
        count = 0
        for row in reader:
            domain = row[0]
            price_str = row[1]
            
            # Delete ~5% of first 10k rows
            if count < 10000 and random.random() < 0.05:
                count += 1
                continue
                
            # Change price for ~10% of first 10k rows
            if count < 10000 and random.random() < 0.10:
                writer.writerow([domain, "$9,999,999.00"])
            else:
                writer.writerow(row)
                
            count += 1
            if count >= 100000: # Take 100k rows
                break
                
        # Add 50 new domains
        for i in range(50):
            writer.writerow([f"new-super-fake-domain-{i}.com", "$50.00"])
            
    print("Dummy CSV created successfully.")

if __name__ == "__main__":
    generate_dummy()
